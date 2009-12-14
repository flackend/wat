#!/bin/sh

ZIP=zip
JAR=wat.jar
VERSION=0.1

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

JSM=`find modules -type d -o -name "*.jsm" `
PREF=`find defaults -type d -o -name "*.js"`

echo "creating ${XPI}"
zip -2 ${XPI} \
	chrome \
	chrome/${JAR} \
	chrome.manifest \
	${JSM} \
	${PREF} \
	install.rdf \
	license.txt


