#!/bin/sh

ZIP=zip
JAR=wat.jar
VERSION=0.4.5
TMPDIR=tmp
XPI=wat-${VERSION}.xpi

if [ -d ${TMPDIR} ];then
	rm -rf ${TMPDIR}
fi
mkdir ${TMPDIR}
cp -pr chrome defaults chrome.manifest install.rdf license.txt README.md ${TMPDIR}

echo "replacing ####VERSION#### to $VERSION"
find ${TMPDIR} -type f | xargs perl -i.bk -pe 's/####VERSION####/'${VERSION}'/g'
find ${TMPDIR} -type f -name "*.bk" | xargs rm

echo "creating ${JAR}"
(cd tmp/chrome; zip ${JAR} -r content locale skin;)

if [ -f ${XPI} ];then
	rm ${XPI}
fi

PREF=`(cd tmp; find defaults -type d -o -name "*.js";)`

echo "creating ${XPI}"
(cd ${TMPDIR}; zip -2 ../${XPI} \
	chrome \
	chrome/${JAR} \
	chrome.manifest \
	${PREF} \
	install.rdf \
	license.txt \
	README.md;)

