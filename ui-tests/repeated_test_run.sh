#!/bin/bash

i=0

while true; do 
    i=$((i+1))
    jlpm run test
    if [ $? -eq 0 ]
    then
        echo "Test run succeeded $i times..."
    else
        echo "Test run failed! Run 'jlpm run test:launch-last-report' to inspect test results."
        exit 0
    fi
done
