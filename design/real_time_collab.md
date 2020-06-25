# Real Time Collaboration Design

This purpose of this document is to describe the design of the real-time collaboration (RTC)
features we are building for JupyterLab. The focus here is primarily on the user experience
and usage cases, rather than on the implementation details.

## Personas

### Jon the Academic Data Scientist

Jon is an academic researcher and data scientist. He has been using the Jupyter Notebook daily
for many years and is an advanced user, teacher and book author. He uses the Notebook
exclusively on his local system and stores his notebooks on GitHub, in including blog posts
and full length books.

Jon regularly works with students, postdocs and other faculty at his own and other universities
on a wide range of projects. These projects involve the collaborative creation of notebooks,
markdown files, documentation (Sphinx) and source code files (Python, C, C++). His collaborators
also run the notebook their local systems.

Jon and his collaborators need the ability to do ad-hoc collaboration on particular documents. They
are already version controlling their code, documentation and notebooks, but at times, Git/GitHub
don't provide fast enough collaborative interactions. They want to continue to work on their local
systems, with their own local notebook servers, but need to be able to initiate the RTC of
one or more files or a directory of files with a group of individuals.

During the RTC sessions, the participants are focused on the following aspects of their
work:

- Collaborative editing of content.
- Side channel live discussions (Bluejeans, appear.in, phonecalls).
- Discussion and exploration of results.

All individuals in the collaboration already have access to the files (Git/GitHub).
Because of this, during the RTC they need to be able to collaborative edit the same exact
version, which will later be committed to the repository. Because of this, only one participant
would have a live filesystem representation of the edited file. At the end of the ad-hoc RTC session,
the individuals would go back to syncing their changes through GitHub.

## The MTTU Scientific Collaboration

The MTTU Scientific Collaboration is a planet-wide scientific collaboration in the field
of Physics. They are building a large experiment that will go live in a few years and have a
ten year observing cycle. Once operational, they will collect petabytes of data that will be
accessed by thousands of scientific users.

The collaboration has a software stack based on Python and C++ and is embracing modern,
software engineering practices (version control with Git/GitHub, Travis, Slack, etc.). They version
control everything and run an extensive test suite on each commit. The collaboration is exploring the possibility of using JupyterHub to provide a unified user-experience for their users to access data
and their analysis software.

The collaboration would run JupyterLab with JupyterHub, and build custom JupyterLab extensions that
have custom front-end UIs that talk to their various backend services. They want to provide RTC
capabilities for all of their services to enable the users and scientists to work with notebooks,
text files and their custom backend services in a collaborative manner. Most of their RTC session will
take place on shared single-user notebook servers managed by JupyterHub. This style of collaboration
will also extend to Jupyter Notebook, Sphinx based documentation, Python/C++ source code files.
In their JupyterHub deployment these files are managed on a massive scale shared file system that is
deployed on their compute infrastructure. Again, all files are version controlled at the end of the day.

## Arya the Data Science student

Emma is a Junior Computer Science Major taking an introductory course in Data Science with Python.
Her professor uses the Jupyter Notebook for all course materials and homework. The notebook is
deployed on a single server using JupyterHub and nbgrader is used for all course material.
This is the first time Emma has used the Jupyter Notebook and she is enjoying the experience.
Git/GitHub is not used in the course; only a few of her classmates have ever used it, and mostly
in the context of internships.

Towards the end of the quarter, her professor assigns group projects. The students quickly realize
that they will need the ability to easily share content. They appoint a single group member to
hold the master copies of all their files for the project and then create a persistent share RTC
session that enables all project members to work with the files at the same time. This was all
possible without the instructors involvement (other than installing the RTC JupyterLab extension).

As the students work collaboratively, the master copies of the files are updated and at the end of the
project, those master copies are turned in. During the project, students both run code in their
own private kernels and a shared kernel.
