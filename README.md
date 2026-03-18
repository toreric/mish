# Mish

This is a development project of the Mish one-page gallery app run in a standard web browser, installed locally or on a web server. The aim is to utilize the Glimmer engine of Ember Polaris without the Ember data model and without Typescript.

# Mish outline

The core ember project is 'mish/browser' containing the application core. It may be run primitively with the Ember development server only, though with full functionality (incudes sqlite3) through the node express project 'mish/server'; that is, locally run by an Express Node JS server. Mish may also be run by the Apache2 web server, served by PM2 and Node Express.

I have decided not to use the Ember data model in order to try making the system better self-contained and movable. The aim is to make possible to show an unlimited number of albums or photo directories/folders/galleries (naming conventions differ, here 'album').

An 'album collection' or 'root album' is a chosen file tree root directory where each subdirectory may be recognized as an album. Each album (also the root album) is suggested to contain a maximum of about one hundred pictures, which is roughly reasonable for keeping overview on a computer screen. Picture thumbnails (if any) appear alongside sub-album references (if any), equivalent to a file tree.

A directory qualifies as an autodetectable album when it contains a file named '.imdb' (my acronyme for 'image database', not to be mixed up with something else).

A main idea is to keep all information, such as picture legend etc., as metadata within the picture. Thus the pictures may be squashed around by some means and still be more easily reorganized than if their descriptions have been lost. Nevertheless, an embedded Sqlite database is maintained, where picture information is collected (automatically and on demand) for fast free-text search of/in such as file names, picture legends, etc.

Please mail me for better information!


# Recent history (tldr)

## About mish-dev (archived)

This was an attempt to save as much as possible from the ten year **Mish** project (at present arcived as mish-old) which is a gallery application built ’originally eventually’ using Javascript (JS) and Jquery with Ember as mainly rendering engine for a single page application (SPA) where ’albums’ are maintained with photos in an ordinary file catalog structure.

## What should be done?

The application to be refactoried runs on https://mish.hopto.org/ as long as its server system supports the present version. You need to find ’Mish-demo’ in the main menu in order to see the full functionality.

The intention is not to work with neither Ember Data (ED), Typescript (TS), nor Jquery. It may rather become a ’Glimmer application’ where Ember is used when required to support Glimmer. Still there may be some files reminding of ED and TS from historic or indirect dependency reasons. The photo album catalogs form the application data base, with Sqlite support.

## Dialogs

The first task will be to replace the Jquery remedies, where its dialog utility is most important. The first attempt focused on the possibility to use the JS `xdialog` for that purpose. This was soon abandoned for testing Ember's `modal` prepared utility. For mostly customization reasons, the HTML `dialog` tag was next in test, and so far in November 2023 the most promising. 
