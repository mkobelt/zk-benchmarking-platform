#!/bin/sh

set -e

cd $(dirname -- "$0")/source
./build_release.sh
