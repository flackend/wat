#!/bin/sh

ZIP=zip
JAR=wat.jar
VERSION=0.8
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

if [ -f ${XPI} ];then
	rm ${XPI}
fi

echo "creating ${XPI}"
(cd ${TMPDIR}; zip -9 ../${XPI} -r \
	chrome \
	chrome.manifest \
  defaults \
	install.rdf \
	license.txt \
	README.md;)

