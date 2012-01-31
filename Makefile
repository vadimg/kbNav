SRC_DIR = src
DEP_DIR = deps
BUILD_DIR = build

PREFIX = .
DIST_DIR = ${PREFIX}/dist

JS_ENGINE ?= `which node nodejs 2>/dev/null`
COMPILER = ${JS_ENGINE} ${BUILD_DIR}/uglify.js --unsafe

MODULES = ${DEP_DIR}/jquery.autoresize.js\
	${SRC_DIR}/core.js\
	${SRC_DIR}/select.js\

KB = ${DIST_DIR}/kbnav.js
KB_MIN = ${DIST_DIR}/kbnav.min.js

all: kbnav min hint
	@@echo "kbNav build complete."

${DIST_DIR}:
	@@mkdir -p ${DIST_DIR}

kbnav: ${KB}

${KB}: ${MODULES} | ${DIST_DIR}
	@@echo "Building" ${KB}
	@@cat ${MODULES} > ${KB};

hint: kbnav
	@@if test ! -z ${JS_ENGINE}; then \
		echo "Checking kbNav against JSHint..."; \
		${JS_ENGINE} build/jshint-check.js; \
	else \
		echo "You must have NodeJS installed in order to test against JSHint."; \
	fi

min: kbnav ${KB_MIN}

${KB_MIN}: ${KB}
	@@if test ! -z ${JS_ENGINE}; then \
		echo "Minifying kbNav" ${KB_MIN}; \
		${COMPILER} ${KB} > ${KB_MIN}; \
	else \
		echo "You must have NodeJS installed in order to minify."; \
	fi

clean:
	@@echo "Removing Distribution directory:" ${DIST_DIR}
	@@rm -rf ${DIST_DIR}

.PHONY: all kbnav hint min clean
