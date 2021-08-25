#!/usr/bin/env python3
import csv, pandas as pd, numpy as np

# input_file='ledger_Casa-Demo.csv.txt'
# Specify the filename with extenison
input_file=input()


with open(input_file,'r') as in_file:
	Final=[]                                   # To store the final output to write into .csv
	
	stripped=(line.strip() for line in in_file)    # Entire file is sliced into lines 
	
	lines=(line.split(";") for line in stripped if line)  
	#Every line is split based on delimiter the input_file is containing.
	
	# we can assign or customize the Input file name here
 	my_csv=open("Result_file1.csv",'w')
	
	for i in stripped:
		#print(list(i.split(',')),end='\n')
		
		x=list(i.split(','))
		Final.append(x)
	
	#print(Final)
	
	# we can assign or customize the Input file name here
 	filename = "Result1.csv"
	
	# Output is written inside the new_csv file.
	# While creating, if file doesn't exist, it creates one 
	# or replaces if the file already exist.
 
	with open(filename, 'w', newline='') as csvfile: 
    		# creating a csv writer object 
    		csvwriter = csv.writer(csvfile) 
                
    		# writing the data rows 
    		csvwriter.writerows(Final)
	





	

