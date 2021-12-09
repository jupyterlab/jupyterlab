.. first-program:

First Program
=======================

Setting up a new program is always difficult at first. Hopefully, this tutorial will guide you
through a common use of Jupyter Lab. This tutorial will go over graphing some data using matplotlib. 
When you are done with this tutorial, you will be able to get all started with JupyterLab. 


Start by running 'pip install jupyterlab' in the command line

Then go to https://fred.stlouisfed.org/series/T5YIE and download the data in the csv format.

Open the jupyterlab software by running: jupyter notebook

Open a new python file by clicking on the new dropdown menu

Import the csv file that you downloaded into jupyterlab

Paste the following code:

/////////////////////////////////////
import pandas as pd
import matplotlib.pyplot as plot

df = pd.read_csv('T5YIE.csv')


plot.scatter('DATE','T5YIE', data=df)
plot.xlabel('Date')
plot.ylabel('5 year inflation rate')
plot.show()
//////////////////////////////////////

Click on the Run button above the cell - you should get this immage:

https://github.com/betrabes/jupyterdocumentation/blob/main/Screen%20Shot%202021-12-08%20at%2010.57.58%20PM.png

If the plot is not instantaneous, do not worry. There may be this symbol that looks like a sand timer:

https://github.com/betrabes/jupyterdocumentation/blob/main/Screen%20Shot%202021-12-08%20at%2011.15.45%20PM.png

Congratulations, you have just run your first program! You also have created your first plot in JupyterLab. 
You can now just tweak the features a little bit from the code above to plot any type of data from a csv file. 

You can change the code a little to customize your plot as shown below:

/////////////////////////////////////
import pandas as pd
import matplotlib.pyplot as plot

df = pd.read_csv('T5YIE.csv')

plot.scatter('DATE','T5YIE', data=df, color = 'r', s = 60)
plot.xlabel('Date')
plot.ylabel('5 year inflation rate')
plot.title('Inflation Rate over 5 years')
plot.grid(True)
                
plot.show()//////////////////////////////////////

To create the result: 
https://github.com/betrabes/jupyterdocumentation/blob/main/Screen%20Shot%202021-12-08%20at%2010.57.58%20PM.png

If you run into an error with your code, you may see a error message like this:

https://github.com/betrabes/jupyterdocumentation/blob/main/Screen%20Shot%202021-12-08%20at%2011.03.14%20PM.png

Resulting in...

https://github.com/betrabes/jupyterdocumentation/blob/main/Screen%20Shot%202021-12-08%20at%2011.06.05%20PM.png

This is a normal occurance in JupyterLab. All that occured is an error in your code which JupyterLab shows you. 
You can then adjust your code, thus fixing the error message. 

Congrats on your first JupyterLab program! This is just the beginning!
