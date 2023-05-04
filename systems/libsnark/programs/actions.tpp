#include <fstream>
#include <iostream>
#include <filesystem>

#include <libsnark/zk_proof_systems/ppzksnark/r1cs_ppzksnark/r1cs_ppzksnark.hpp>
#include <libsnark/relations/constraint_satisfaction_problems/r1cs/examples/r1cs_examples.hpp>
#include <libsnark/relations/constraint_satisfaction_problems/r1cs/r1cs.hpp>
#include <libsnark/gadgetlib1/gadgets/hashes/sha256/sha256_gadget.hpp>
#include <libsnark/gadgetlib1/gadgets/hashes/sha256/sha256_components.hpp>
#include <libsnark/gadgetlib1/pb_variable.hpp>
#include <libsnark/gadgetlib1/gadgets/hashes/hash_io.hpp>

using namespace libsnark;
using namespace libff;

template<typename CurveT>
void compile() {
    typedef Fr<CurveT> FieldT;

    protoboard<FieldT> board;
    digest_variable output(board, SHA256_digest_size, "output");
    block_variable<FieldT> input(board, SHA256_block_size, "input");
    sha256_compression_function_gadget gadget(board, SHA256_default_IV(board), input.bits, output, "sha256");
    board.set_input_sizes(SHA256_digest_size);

    gadget.generate_r1cs_constraints();

    const r1cs_constraint_system constraint_system = board.get_constraint_system();

    std::ofstream outFile;
    outFile.open("out");
    outFile << constraint_system;
    outFile.close();
}

template<typename CurveT>
void generate(const std::filesystem::path& basePath) {
    typedef Fr<CurveT> FieldT;

    r1cs_constraint_system<FieldT> constraint_system;

    std::ifstream csFile((basePath / "out").c_str());
    csFile >> constraint_system;
    csFile.close();

    const r1cs_ppzksnark_keypair keypair = r1cs_ppzksnark_generator<CurveT>(constraint_system);

    std::ofstream pkFile("proving.key");
    pkFile << keypair.pk;
    pkFile.close();

    std::ofstream vkFile("verification.key");
    vkFile << keypair.vk;
    vkFile.close();
}

template<typename CurveT>
void prove(const std::filesystem::path& basePath) {
    typedef Fr<CurveT> FieldT;

    protoboard<FieldT> board;
    digest_variable output(board, SHA256_digest_size, "output");
    block_variable<FieldT> input(board, SHA256_block_size, "input");
    sha256_compression_function_gadget gadget(board, SHA256_default_IV(board), input.bits, output, "sha256");
    board.set_input_sizes(SHA256_digest_size);

    // Sadly we have to regenerate the constraints here because libsnark directly couples the constraint generation with the witness generation
    gadget.generate_r1cs_constraints();

    input.generate_r1cs_witness(libff::int_list_to_bits({0x6c6c6568, 0x6f77206f, 0x00646c72, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000}, 32));
    gadget.generate_r1cs_witness();
    output.generate_r1cs_witness(libff::int_list_to_bits({0xc082e440, 0x671cd799, 0x8baf04c0, 0x22c07e03, 0x4b125ee7, 0xd28e0a59, 0x49e4b924, 0x5f5cf897}, 32));

    assert(board.is_satisfied());

    r1cs_ppzksnark_proving_key<CurveT> pk;
    std::ifstream pkFile((basePath / "proving.key").c_str());
    pkFile >> pk;
    pkFile.close();

    const r1cs_ppzksnark_proof proof = r1cs_ppzksnark_prover(pk, board.primary_input(), board.auxiliary_input());
    std::ofstream proofFile("proof");
    proofFile << proof;
    proofFile.close();
}

template<typename CurveT>
void verify(const std::filesystem::path& basePath) {
    typedef Fr<CurveT> FieldT;

    r1cs_ppzksnark_verification_key<CurveT> vk;
    std::ifstream vkFile((basePath / "verification.key").c_str());
    vkFile >> vk;
    vkFile.close();

    r1cs_ppzksnark_proof<CurveT> proof;
    std::ifstream proofFile((basePath / "proof").c_str());
    proofFile >> proof;
    proofFile.close();

    protoboard<FieldT> board;
    board.set_input_sizes(SHA256_digest_size);
    digest_variable output(board, SHA256_digest_size, "output");
    block_variable<FieldT> input(board, SHA256_block_size, "input");
    sha256_compression_function_gadget gadget(board, SHA256_default_IV(board), input.bits, output, "sha256");

    // Sadly we have to regenerate the constraints here because libsnark directly couples the constraint generation with the witness generation
    gadget.generate_r1cs_constraints();

    output.generate_r1cs_witness(libff::int_list_to_bits({0xc082e440, 0x671cd799, 0x8baf04c0, 0x22c07e03, 0x4b125ee7, 0xd28e0a59, 0x49e4b924, 0x5f5cf897}, 32));

    assert(r1cs_ppzksnark_verifier_weak_IC(vk, board.primary_input(), proof));
}
