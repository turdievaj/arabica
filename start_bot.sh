#!/bin/bash
set -a
source /root/arabica/.env
set +a
exec node /root/arabica/src/index.js
