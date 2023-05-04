cmake_minimum_required(VERSION 3.8)

project(libsnark_benchmarks)

set(CMAKE_CXX_STANDARD 17)

add_subdirectory(../source libsnark EXCLUDE_FROM_ALL)

foreach(CURVE bn128 alt_bn128 edwards)
    string(TOUPPER ${CURVE} CURVE_UPPER)

    foreach(STEP compile setup prove verify)
        set(TARGET ${CURVE}_${STEP})
        string(TOUPPER ${STEP} STEP_UPPER)

        add_executable(${TARGET} main.cpp)
        target_compile_definitions(${TARGET} PUBLIC BENCHMARKING_CURVE_${CURVE_UPPER} BENCHMARKING_STEP_${STEP_UPPER})
        target_link_libraries(${TARGET} snark)
        target_include_directories(${TARGET} PRIVATE ../source)
    endforeach()
endforeach()
