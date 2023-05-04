#ifdef BENCHMARKING_CURVE_BN128
    #include <libff/algebra/curves/bn128/bn128_pp.hpp>
    #define BENCHMARKING_CURVE_TYPE libff::bn128_pp
#elif defined(BENCHMARKING_CURVE_ALT_BN128)
    #include <libff/algebra/curves/alt_bn128/alt_bn128_pp.hpp>
    #define BENCHMARKING_CURVE_TYPE libff::alt_bn128_pp
#elif defined(BENCHMARKING_CURVE_EDWARDS)
    #include <libff/algebra/curves/edwards/edwards_pp.hpp>
    #define BENCHMARKING_CURVE_TYPE libff::edwards_pp
#else
    #error Curve not defined
#endif

#include <filesystem>

#include <libff/common/profiling.hpp>

#include "actions.hpp"

int main(int argc, char *argv[]) {
    assert(argc == 2);

    libff::inhibit_profiling_counters = true;
    libff::inhibit_profiling_info = true;
    BENCHMARKING_CURVE_TYPE::init_public_params();

    const std::filesystem::path basePath(argv[1]);

#ifdef BENCHMARKING_STEP_COMPILE
    compile<BENCHMARKING_CURVE_TYPE>();
#elif defined(BENCHMARKING_STEP_SETUP)
    generate<BENCHMARKING_CURVE_TYPE>(basePath);
#elif defined(BENCHMARKING_STEP_PROVE)
    prove<BENCHMARKING_CURVE_TYPE>(basePath);
#elif defined(BENCHMARKING_STEP_VERIFY)
    verify<BENCHMARKING_CURVE_TYPE>(basePath);
#else
    #error Step not defined
#endif
}