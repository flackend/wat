#!/bin/sh

ZIP=zip
JAR=wat.jar
VERSION=0.1a

XPI=wat-${VERSION}.xpi
# make jar
if [ -f "chrome/${JAR}" ];then
	rm chrome/${JAR}
fi
echo "creating ${JAR}"
(cd chrome; zip ${JAR} -r content locale skin;)

if [ -f ${XPI} ];then
	rm ${XPI}
fi

PREF=`find defaults -type d -o -name "*.js"`

echo "creating ${XPI}"
zip -2 ${XPI} \
	chrome \
	chrome/${JAR} \
	chrome.manifest \
	${PREF} \
	install.rdf \
	license.txt


