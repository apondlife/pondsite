#!/bin/sh

# -- consants --
DST_PATH="dst"

# -- commands --
# builds the environment-specific eleventy command.
#
# args:
# - $env_name: the environment name, if any
#
# env:
# - $IS_DEBUG: if nonempty, uses the local path
#
# outputs:
# - $ELEVENTY: the eleventy command.
FindEleventy() {
  env_name=$1; shift

  # add env specific flags
  eleventy_env=""
  if [ "$env_name" = "prod" ]; then
    eleventy_env="PROD=1"
  fi

  # use debug logging if specified
  if [ -n "$IS_DEBUG" ]; then
    eleventy_env="$eleventy_env DEBUG=Eleventy*"
  fi

  ELEVENTY="env $eleventy_env ./node_modules/.bin/eleventy"
}