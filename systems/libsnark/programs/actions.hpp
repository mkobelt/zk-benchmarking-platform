#pragma once

template<typename CurveT>
void compile();
template<typename CurveT>
void generate(const std::filesystem::path&);
template<typename CurveT>
void prove(const std::filesystem::path&);
template<typename CurveT>
void verify(const std::filesystem::path&);

#include "actions.tpp"
