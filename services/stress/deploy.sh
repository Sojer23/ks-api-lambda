#Get file name
pwd=`pwd`
file_name=$(basename $pwd)
file_name_zip+=$file_name".zip"
echo "File to upload: " $file_name_zip

#Get lambda name
# lambda_function_total="LLM_"
lambda_function_total+=$file_name
echo "Lambda function to upload: " $lambda_function_total


#Check if lambda exists
if [ -f $file_name_zip ]; then 
    rm -rf $file_name_zip 
fi

#Compress all files
zip -r $file_name .

#Upload function to AWS Lambda
aws lambda update-function-code --function-name $lambda_function_total --zip-file fileb://$file_name_zip

#Remove zip file
rm -rf $file_name_zip 