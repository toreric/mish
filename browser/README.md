# Mish-dev

This is an attempt to save as much as possible from the ten year **Mish** project which is a gallery application built ’originally eventually’ using Javascript (JS) and Jquery with Ember as mainly rendering engine for a single page application (SPA) where ’albums’ are maintained with photos in an ordinary file catalog struture.

## What should be done?

The application to be refactoried runs on https://mish.hopto.org/ as long as its server system supports the present version. You need to find ’Mish-demo’ in the main menu in order to see the full functionality.

The intention is not to work with neither Ember Data (ED), Typescript (TS), nor Jquery. It may rather become a ’Glimmer application’ where Ember is used when required to support Glimmer. Still there may be some files reminding of ED and TS from historic or indirect dependency reasons. The photo album catalogs form the application data base, with Sqlite support.

## Dialogs

The first task will be to replace the Jquery remedies, where its dialog utility is most important. The first attempt focused on the possibility to use the JS `xdialog` for that purpose. This was soon abandoned for testing Ember's `modal` prepared utility. For mostly customization reasons, the HTML `dialog` tag was next in test, and so far in November 2023 the most promising. ********
