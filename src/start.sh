if [ "$#" -ne 1 ]; then
    echo "Specify the target"
fi
cp tsconfig.json $1
cp package.json $1
cd $1
mkdir src
git mv *.ts src
PATTERN=(/*.css)
if [ -f ${PATTERN[0]} ]; then
    mkdir style
    git mv *.css style
fi
cd ..
node test.js $1
cd $1
find . -name "*.ts" -exec sed -i "" -e "s/from '\.\./from '@jupyterlab/g" {} +
git add .
subl package.json
cd ..
