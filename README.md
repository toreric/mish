# Mish-dev

This is a development project of the Mish one-page gallery app run in a standard web browser, installed locally or on a web server. The aim is to utilize the Glimmer engine of Ember Polaris without the Ember data model and without Typescript.

# Mish outline

The core project is 'mish-project' containing the application core. It may be run primitively with the Ember development server only, but is wrapped within the 'mish' project and locally run by an Express Node JS server. Currently it is run on the web by Apache2 served by PM2 and Node Express.

I have decided not to use the Ember data model in order to try making the system better self-contained and movable. The aim is to make possible to show an unlimited number of albums or photo directories/folders/galleries (naming conventions differ, here 'album').

An 'album collection' or 'root album' is a chosen file tree root directory where each subdirectory may be recognized as an album. Each album (also the root album) is suggested to contain a maximum of about one hundred pictures, which is roughly reasonable for keeping overview on a computer screen. Picture thumbnails (if any) appear alongside sub-album references (if any), equivalent to a file tree.

A directory qualifies as an autodetectable album when it contains a file named '.imdb' (my acronyme for 'image database', not to be mixed up with something else).

A main idea is to keep all information, such as picture legend etc., as metadata within the picture. Thus the pictures may be squashed around by some means and still be more easily reorganized than if their descriptions have been lost. Nevertheless, an embedded Sqlite database is maintained, where picture information is collected (automatically and on demand) for fast free-text search of/in such as file names, picture legends, etc.

Please mail me for better information!
