/* eslint-disable no-console */
// eslint ember/avoid-leaking-state-in-ember-objects: "off" */
// (cannot use ember-context-menu with the 'leaking-state' rule)
import Component from '@ember/component'
import EmberObject from '@ember/object';
import $ from 'jquery';
import { later } from '@ember/runloop';
import Ember from 'ember';
import { htmlSafe } from '@ember/string';
import { task } from 'ember-concurrency';
import contextMenuMixin from 'ember-context-menu';
export default Component.extend (contextMenuMixin, {

  // TEMPLATE PERFORM tasks, reachable from the HTML template page
  /////////////////////////////////////////////////////////////////////////////////////////

  rstBrdrs: task (function* () {
    if ($ (".mainMenu").is (":visible")) {
      // Close this if visible:
      $ (".mainMenu").hide ();
    } else {
      resetBorders ();
    }
    yield null; // required
  }),

  requestDirs: task (function* () {
    let imdbroot = this.get ("imdbRoot");
    document.title = "Mish";
    if (imdbroot === "") {

      let rootList = $ ("#imdbRoots").text (); // Amendment after move to 'init ()'
      if (!rootList) rootList = yield reqRoot (); //  First, get possible rootdirs ((1))
      if (rootList) {
        rootList = rootList.split ("\n");
        let seltxt = rootList [0];
        rootList.splice (0, 1, "");
        rootList [0] = "Välj albumkatalog "; // i18n, must have a space
        let selix = rootList.indexOf (seltxt);
        if (selix > 0) {
          this.set ("imdbRoot", seltxt);
          $ ("#imdbRoot").text (seltxt);
          imdbroot = seltxt;
        }
        this.set ("imdbRoots", rootList);
        rootList = rootList.join ("\n");
        $ ("#imdbRoots").text (rootList);
      }

      if (imdbroot === "") {
        // Prepare to select imdbRoot
        $ (".mainMenu").show ();
        $ ("iframe.intro").hide ();
        $ (".mainMenu p:gt(1)").hide (); // Shown at selectRoot ()
        this.set ("albumData", [])
        return;
      }
    }

    document.title = "Mish: " + removeUnderscore (imdbroot, true);
    //yield reqDirs (imdbroot); // Request all subdirs recursively ((2))
    // MUST BE POSTPONED UNTIL imdLink is server-established!

    if (this.get ("albumData").length === 0) {
      yield reqDirs (imdbroot); // Then request subdirectories recursively ((2))
    }

    this.set ("userDir", $ ("#userDir").text ());
    this.set ("imdbRoot", $ ("#imdbRoot").text ());
    this.set ("imdbDirs", $ ("#imdbDirs").text ().split ("\n"));
    this.set ("imdbLink", $ ("#imdbLink").text ());

    if (this.get ("albumData").length === 0) {
      // Construct dirList|treePath for jstree data = albumData
      let treePath = this.get ("imdbDirs");
      let imdbLink = this.get ("imdbLink");
      for (var i=0; i<treePath.length; i++) {
        if (i === 0) {treePath [i] = imdbLink;} else {
          treePath [i] = imdbLink + treePath [i].toString ();
        }
      }
      let albDat = aData (treePath);
      // Substitute the first name (in '{text:"..."') into the root name:
      albDat = albDat.split (","); // else too long a string (??)
      albDat [0] = albDat [0].replace (/{text:".*"/, '{text:"' + ' <span style=\'font-family:Arial;font-weight:bold;font-size:80%\'>ROT: </span>" + this.get ("imdbRoot")');
      albDat = albDat.join (",");
      let count = $ ("#imdbCoco").html ().split ("\n");
      for (let i=0; i<count.length; i++) {
        albDat = albDat.replace (/{text:"([^" ]*)"/, "{text:€$1<small>" + count[i + 1] + "</small>\"");
      }
      albDat = albDat.replace (/€/g, '"');
      this.set ("albumData", eval (albDat));
      if (tempStore) { // This is not in use (?) ... too sophisticated ...
        //alert ('75 tempStore true'); // borde testa här hur det är ^^^
        $ (".ember-view.jstree").jstree ("close_all");
        $ (".ember-view.jstree").jstree ("open_node", $ ("#j1_1"));
        $ (".ember-view.jstree").jstree ("_open_to", "#j1_" + tempStore);
        later ( ( () => {
          $ (".ember-view.jstree").jstree ("select_node", $ ("#j1_" + tempStore)); // calls selectAlbum
          tempStore = "";
        }), 400);
      } else {
        //alert ('83 tempStore false');
        this.set ("albumText", "");
        this.set ("albumName", "");
      }
    }
  }).drop (),

  // CONTEXT MENU Context menu
  /////////////////////////////////////////////////////////////////////////////////////////
  contextItems: [
    { label: "×", disabled: false, action () {} }, // Spacer closes menu
    { label: 'Information',
      disabled: false,
      action () {
        showFileInfo ();
      }
    },
    { label: 'Redigera text...',
      disabled: () => {
        return !(allow.textEdit || allow.adminAll);
      },
      //disabled: false, // For 'anyone text preview' change to this 'disabled:' line!
      // NOTE: Also search for TEXTPREVIEW for another change needed!
      action: () => {
        // Mimic click on the text of the mini-picture (thumbnail)
        $ ("#i" + escapeDots ($ ("#picName").text ().trim ()) + " a").next ().next ().next ().trigger ("click");
      }
    },
    { label: 'Redigera bild...', // i18n
      disabled: () => {
        return !(allow.imgEdit || allow.adminAll);
      },
      // to be completed ...
      action () {
        var title = "Information";
        var text = "<br>”Redigera bild...” är en planerad framtida länk<br>till något bildredigeringsprogram"; // i18n
        var yes = "Ok" // i18n
        infoDia (null, null, title, text, yes, true);
        return;
      }
    },
    { label: 'Göm eller visa', // Toggle hide/show
      disabled: () => {
        return !(allow.imgHidden || allow.adminAll);
    },
    action () {
      var picName, act, nels, nelstxt, picNames = [], nodelem = [], nodelem0, i;
      later ( ( () => { // Picname needs time to settle...
        picName = $ ("#picName").text ().trim ();
      }), 50);
      picName = $ ("#picName").text ().trim ();
      picNames [0] = picName;
      resetBorders (); // Reset all borders
      markBorders (picName); // Mark this one
      nels = 1;
      nelstxt = "";
      nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
      var picMarked = nodelem0.className === "markTrue";
      if (picMarked) {
        picNames = [];
        nodelem = document.getElementsByClassName ("markTrue");
        nels = nodelem.length;
        if (nels === 2) nelstxt = " båda två";
        if (nels > 2) nelstxt = " alla " + nels;
        for (i=0; i<nodelem.length; i++) {
          picNames.push (nodelem [i].nextElementSibling.innerHTML.trim ());
          markBorders (picNames [i]); // Mark borders
        }
      }
      //console.log (nodelem0.parentNode.style.backgroundColor); // Check representation!
      if (nodelem0.parentNode.style.backgroundColor === $ ("#hideColor").text ())
        {act = 0;} else {act = 1;} // 0 = show, 1 = hide (it's the hide flag!)
      var actxt1 = ["Vill du visa", "Vill du gömma"];
      var actxt2 = ["ska visas", "ska gömmas"];
      $ ("#dialog").html ("<b>" + actxt1 [act] + nelstxt + "?</b><br>" + cosp (picNames) + "<br>" + actxt2 [act]); // Set dialog text content
      $ ("#dialog").dialog ( { // Initiate dialog
        title: "Göm eller visa...",
        autoOpen: false,
        draggable: true,
        modal: true,
        closeOnEscape: true
      });
      // Define button array
      $ ("#dialog").dialog ('option', 'buttons', [
      {
        text: "Ja", // Yes
        "id": "allButt", // Process all
        click: function () {
          hideFunc (picNames, nels, act);
          $ (this).dialog ('close');
        }
      },
      {
        text: "", // Set later, in order to include html tags (illegal here)
        "id": "noButt",
        click: function () {
          $ (this).dialog ('close');
        }
      }]);
      $ ("#noButt").html ("<b>Nej, avbryt</b>"); // i18n
      niceDialogOpen ();
      $ ("#allButt").focus ();
    }
  },
  { label: "───────────────", disabled: false, action () {} }, // Spacer closes menu
  { label: 'Markera/avmarkera alla',
    disabled: false,
    action () {
      var picName = $ ("#picName").text ().trim ();
      var tmp = document.getElementById ("i" + picName).firstElementChild.nextElementSibling.className;
      var marked;
      $ ("[alt='MARKER']").removeClass ();
      $ ("#markShow").removeClass ();
      if (tmp === "markTrue") {
        $ ("[alt='MARKER']").addClass ("markFalse");
        $ ("#markShow").addClass ("markFalseShow");
        marked = "0";
      } else {
        $ ("[alt='MARKER']").addClass ("markTrue");
        $ ("#markShow").addClass ("markTrueShow");
        marked = $ ("[alt='MARKER']").length;
      }
      $ (".numMarked").text (marked);
      resetBorders (); // Reset all borders
    }
  },
  { label: 'Markera bara dolda',
    disabled: () => {
      return false;
    },
    action () {
      let hico = $("#hideColor").text ();
      let tmp = document.getElementsByClassName ("img_mini");
      for (let i=0; i<tmp.length; i++) {
        tmp [i].querySelector ("div[alt='MARKER']").setAttribute ("class", "markFalse") ;
        if (tmp [i].style.backgroundColor === hico) {
          tmp [i].querySelector ("div[alt='MARKER']").setAttribute ("class", "markTrue") ;
        }
      }
      $ ('.showCount .numMarked').text ($ (".markTrue").length + " ");
    }
  },
  { label: 'Invertera markeringar',
    disabled: false,
    action () {
      $ (".markTrue").addClass ("set_false");
      $ (".markFalse").addClass ("set_true");
      $ (".set_false").removeClass ("markTrue");
      $ (".set_true").removeClass ("markFalse");
      $ (".set_false").addClass ("markFalse");
      $ (".set_true").addClass ("markTrue");
      $ (".markTrue").removeClass ("set_true");
      $ (".markFalse").removeClass ("set_false");
      var marked = $ (".markTrue").length;
      $ (".numMarked").text (" " + marked);
      var cn = document.getElementById ("markShow").className;
      $ ("#markShow").removeClass ();
      if (cn === "markFalseShow") {
        $ ("#markShow").addClass ("markTrueShow");
      } else {
        $ ("#markShow").addClass ("markFalseShow");
      }
      resetBorders (); // Reset all borders
    }
  },
  { label: 'Placera först',
    disabled: () => {
      return !( (allow.imgReorder && allow.saveChanges) || allow.adminAll);
    },
    action () {
      var picName;
      picName = $ ("#picName").text ();
      var sortOrder = $ ("#sortOrder").text ();
      var rex = new RegExp (picName + ",[\\d,]+\\n?", "");
      var k = sortOrder.search (rex);
      if (k < 1) return;
      var line = sortOrder.match (rex) [0];
      sortOrder = sortOrder.replace (line, "");
      sortOrder = sortOrder.replace (/\\n\\n/g, "\n");
      sortOrder = line.trim () + "\n" + sortOrder.trim ();
      $ ("#sortOrder").text (sortOrder);
      saveOrderFunc (sortOrder) // Save on server disk
      .then ($ ("#reLd").trigger ("click")); // Call via DOM... REFRESH
      later ( ( () => {
        scrollTo (null, $ (".showCount:first").offset ().top);
      }), 50);
    }
  },
  { label: 'Placera sist',
    disabled: () => {
      return !( (allow.imgReorder && allow.saveChanges) || allow.adminAll);
    },
    action () {
      var picName;
      picName = $ ("#picName").text ();
      var sortOrder = $ ("#sortOrder").text ();
      var rex = new RegExp (picName + ",[\\d,]+\\n?", "");
      var k = sortOrder.search (rex);
      if (k < 0) return;
      var line = sortOrder.match (rex) [0];
      sortOrder = sortOrder.replace (line, "");
      sortOrder = sortOrder.replace (/\\n\\n/g, "\n");
      sortOrder = sortOrder.trim () + "\n" + line.trim ();
      $ ("#sortOrder").text (sortOrder);
      saveOrderFunc (sortOrder) // Save on server disk
      .then ($ ("#reLd").trigger ("click")); // Call via DOM... REFRESH
      later ( ( () => {
        scrollTo (null, $ ("#lowDown").offset ().top - window.screen.height*0.85);
      }), 50);
    }
  },
  { label:  "───────────────", disabled: false, action () {} }, // Spacer closes menu
  { label: 'Ladda ned...',
    disabled: () => {
      return !(["admin", "editall", "edit"].indexOf (loginStatus) > -1 && (allow.imgOriginal || allow.adminAll));
    },
    action () {
      $ ("#downLoad").trigger ("click"); // Call via DOM since "this" is ...where?
    }
  },
  { label: 'Länka till...', // i18n
    disabled: () => {
      return !(allow.delcreLink || allow.adminAll);
    },
    action () {
      var picName, nels, nlns, nelstxt, linktxt, picNames = [], tmpNames = [], i;
      //await new Promise (z => setTimeout (z, 2000));
      picName = $ ("#picName").text ().trim ();
      resetBorders (); // Reset all borders
      if (document.getElementById ("i" + picName).classList.contains ("symlink")) { // Leave out symlinks
        nels = 0;
      } else {
        markBorders (picName);
        picNames [0] = picName;
        nels = 1;
      }
      let picMarked = document.getElementById ("i" + picName).firstElementChild.nextElementSibling.className === "markTrue";
      if (picMarked) {
        var tmpMarked = document.getElementsByClassName ("markTrue");
        for (i=0; i<tmpMarked.length; i++) {
          tmpNames [i] = tmpMarked [i].nextElementSibling.innerHTML.trim ();
        }
        picNames = [];
        for (i=0; i<tmpNames.length; i++) {
          var tmpName = tmpNames [i];
          // Leave out symlinks and reset mark/count
          if (document.getElementById ("i" + tmpName).classList.contains ("symlink")) { // Leave out symlinks
            document.getElementById ("i" + tmpName).firstElementChild.nextElementSibling.className = "markFalse";
            $ ('.showCount .numMarked').text ($ (".markTrue").length + " ");
          } else {
            picNames.push (tmpName);
            markBorders (tmpName);
          }
        }
        picNames.reverse ();
        nels = picNames.length; // Number of elements
        nlns = tmpNames.length - nels; // Number of links
        linktxt = "";
        if (nlns > 0) {linktxt = "En är länk och kan inte länkas, övriga:<br>";} // i18n
        if (nlns > 1) {linktxt = nlns + " är länkar och kan inte länkas; övriga:<br>";} // i18n
        nelstxt = "Vill du länka alla " + nels; // i18n
        if (nels === 2) {nelstxt = "Vill du länka båda två";} // i18n
      }
      if (nels === 0) {
        var title = "Ingenting att länka"; // i18n
        var text = "<br><b>Omöjligt att länka länkar!</b>"; // i18n
        var yes = "Uppfattat" // i18n
        infoDia (null, null, title, text, yes, true);
        return;
      }
      $ ("#picNames").text (picNames.join ("\n"));
      if (nels > 1) {
        var lnTxt = "<br>ska länkas till visning också i annat album"; // i18n
        $ ("#dialog").html (linktxt + "<b>" + nelstxt + "?</b><br>" + cosp (picNames) + lnTxt); // Set dialog text content
        $ ("#dialog").dialog ( { // Initiate dialog
          title: "Länka till... ", // i18n
          autoOpen: false,
          draggable: true,
          modal: true,
          closeOnEscape: true
        });
        // Define button array
        $ ("#dialog").dialog ('option', 'buttons', [
        {
          text: "Ja", // Yes i18n
          "id": "allButt", // Process (all)
          click: function () {
            $ (this).dialog ('close');
            linkFunc (picNames);
            $.spinnerWait (false, 2012);
          }
        },
        {
          text: "No", // Set later, in order to include html tags (illegal here)
          "id": "noButt",
          click: function () {
            $ (this).dialog ('close');
            resetBorders ();
            markBorders (picName);
          }
        }]);
        $ ("#noButt").html ("<b>Nej, avbryt</b>"); // i18n
        niceDialogOpen ();
        $ ("#allButt").focus ();
      } else { // only when nels === 1
        $ (this).dialog ('close');
        markBorders (picNames [0]); // Mark this single one, even if it wasn't clicked
        linkFunc (picNames);
        $.spinnerWait (false, 2013);
      }
    }
  },
  { label: 'Flytta till...', // i18n
    disabled: () => {
      return !(allow.delcreLink || allow.adminAll);
    },
    action () {
      var picName, nels, nelstxt, movetxt, picNames = [], nodelem = [], nodelem0, i;
      picName = $ ("#picName").text ().trim ();
      resetBorders (); // Reset all borders
      markBorders (picName);
      picNames [0] = picName;
      nels = 1;
      nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
      var picMarked = nodelem0.className === "markTrue";
      if (picMarked) {
        picNames = [];
        nodelem = document.getElementsByClassName ("markTrue");
        for (i=0; i<nodelem.length; i++) {
          var tmpName = nodelem [i].nextElementSibling.innerHTML.trim ();
          picNames.push (tmpName);
          markBorders (tmpName);
        }
      }
      picNames.reverse ();
      var picOrder = [];
      // Remove the random name postfix from any picture in #picFound:
      if ($ ("#imdbDir").text ().indexOf (picFound) > -1) {
        for (i=0; i<picOrder.length; i++) {
          picOrder [i] = picNames [i].replace (/\..{4}$/, "");
        }
      }
      $ ("#picNames").text (picNames.join ("\n"));
      $ ("#picOrder").text (picOrder.join ("\n"));
      nels = picNames.length;
      movetxt = "";
      if (nels === 1) {moveFunc (picNames, picOrder); return;}
      nelstxt = "Vill du flytta alla " + nels; // i18n new from when symlinks may be moved
      if (nels === 2) {nelstxt = "Vill du flytta båda två";} // i18n

      if (nels === 0) { // does never happen, since now symlinks may be moved
        var title = "Ingenting att flytta"; // i18n
        var text = "<br><b>Omöjligt att flytta länkar!</b>"; // i18n
        var yes = "Uppfattat" // i18n
        infoDia (null, null, title, text, yes, true);
        return;
      }
      //console.log (nodelem0.parentNode.style.backgroundColor); // <- Checks this text content
      var mvTxt = "<br>ska flyttas till annat album"; // i18n
      $ ("#dialog").html (movetxt + "<b>" + nelstxt + "?</b><br>" + cosp (picOrder.reverse ()) + mvTxt); // Set dialog text content (picOrder == picNames.without.posfix)
      $ ("#dialog").dialog ( { // Initiate dialog
        title: "Flytta till... ", // i18n
        autoOpen: false,
        draggable: true,
        modal: true,
        closeOnEscape: true
      });
      // Define button array
      $ ("#dialog").dialog ('option', 'buttons', [
      {
        text: "Ja", // Yes i18n
        "id": "allButt", // Process all
        click: function () {
          $ (this).dialog ('close');
          moveFunc (picNames, picOrder);
        }
      },
      {
        text: "", // Set later, in order to include html tags (illegal here)
        "id": "noButt", // Process only one
        click: function () {
          $ (this).dialog ('close');
        }
      }]);
      $ ("#noButt").html ("<b>Nej, avbryt</b>");
      niceDialogOpen ();
      $ ("#allButt").trigger ("focus");
    }
  },
  { label: 'RADERA...',
    disabled: () => {
      return !(allow.delcreLink || allow.deleteImg || allow.adminAll);
    },
    action () {
      // Decide whether also the ORIGINAL will be erased when a LINKED PICTURE is erased
      if (allow.deleteImg && $ ("#eraOrig") [0].checked === true) {
        eraseOriginals = true; // global
      } else {
        eraseOriginals = false;
      }
      var picPath, picName, delNames, all, nels, nelstxt,
        picPaths = [], picNames = [], nodelem = [], nodelem0, linked;
      picName = $ ("#picName").text ().trim ();
      picPath = $ ("#imdbLink").text () + "/" + $ ("#i" + escapeDots (picName) + " a img").attr ("title");
      // Non-symlink clicked:
      var title = "Otillåtet"; // i18n
      var text = "<br><b>—— du får bara radera länkar ——</b>"; // i18n
      var yes = "Uppfattat" // i18n
      let symlink = document.getElementById ("i" + picName).classList.contains ('symlink');
      if (!symlink && !allow.deleteImg) {
        infoDia (null, null, title, text, yes, true);
        return;
      }
      // nels == no of all elements (images), linked == no of linked elements
      nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
      nodelem [0] = nodelem0;
      nels = 1;
      var picMarked = nodelem0.className === "markTrue";
      if (picMarked) {
        picNames = [];
        picPaths = [];
        nodelem = document.getElementsByClassName ("markTrue");
        linked = $ (".symlink .markTrue").length;
        all = "alla ";
        nels = nodelem.length;
        nelstxt = nels; // To be used as text...
        if (nels === 2) {all = "båda "; nelstxt = "två";}
      }
      resetBorders (); // Reset all borders
      for (let i=0; i<nels; i++) {
        let tmpName = nodelem [i].nextElementSibling.innerHTML.trim ();
        picNames.push (tmpName);
        markBorders (tmpName); // Mark this one
      }
      for (let i=0; i<nodelem.length; i++) {
          symlink = document.getElementById ("i" + picNames [i]).classList.contains ('symlink');
          if (symlink && eraseOriginals) {
            /* Use file paths instead of picture names in order to make
            possible erase even symlinked originals (e.g. for dups removal):
            deleteFiles (picNames, nels) was changed to
            deleteFiles (picNames, nels, picPaths) and
            deleteFile (picName) was changed to deleteFile (picPath)
            */
            let tmp = $ ("#imdbLink").text () + "/" + $ ("#i" + escapeDots (picNames [i]) + " a img").attr ("title");
            execute ("readlink -n " + tmp).then (res => {
              res = res.replace (/^(\.{1,2}\/)*/, $ ("#imdbLink").text () + "/");
              picPaths.push (res);
              if (picName === picNames [i]) {
                picPath = res;
              }
            });
          } else {
            picPaths.push ($ ("#imdbLink").text () + "/" + $ ("#i" + escapeDots (picNames [i]) + " a img").attr ("title"));
          }
      }
      delNames = picName;
      if (nels > 1) {

        // Not only symlinks are included:
        if (nels > linked && !allow.deleteImg) {
          infoDia (null, null, title, text, yes, true);
          return;
        }

        delNames =  cosp (picNames);
        nelstxt = "<b>Vill du radera " + all + nelstxt + "?</b><br>" + delNames + "<br>ska raderas permanent";
        if (linked) {
          if (eraseOriginals) {
            nelstxt += " *<br><span style='color:black;font-weight:bold'>* <span style='color:#d00'>Originalet</span> till <span style='color:green'>länk</span> raderas nu också!</span>"; // #d00 is deep red
          } else {
            nelstxt += " *<br><span style='color:green;font-size:85%'>* Då <span style='color:green;text-decoration:underline'>länk</span> raderas berörs inte originalet</span>";
          }
        }
        $ ("#dialog").html (nelstxt); // i18n
        var eraseText = $ ("#imdbDir").text ().replace (/^(.+[/])+/, "") + ": Radera...";
        // Set dialog text content
        $ ("#dialog").dialog ( { // Initiate dialog
          title: eraseText,
          autoOpen: false,
          draggable: true,
          modal: true,
          closeOnEscape: true
        });
        // Close button
        $ ("#dialog").dialog ('option', 'buttons', [ // Define button array
        {
          text: "Ja", // Yes
          "id": "allButt", // Process all
          click: function () {
            $ (this).dialog ('close');
            nextStep (nels);
          }
        },
        {
          text: "", // Set later, (html tags are killed here)
          "id": "noButt", // Process only one
          click: function () {
            var nodelem = [];       // Redefined since:
            nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
            picPaths [0] = picPath;
            picNames [0] = picName;
            delNames = picName;
            nels = 1;
            $ (this).dialog ('close');
          }
        }]);
        $ ("#noButt").html ("<b>Nej, avbryt</b>"); // May contain html
        niceDialogOpen ();
        $ ("#allButt").focus ();
      } else {
        nextStep (nels);
      }

      function nextStep (nels) {
        // From the full album relative path <imdbDir>:
        // 1 remove "<imdbLink>/" and all following "<album>/"s, leaving the last
        // 2 if still "<imdbLink>", change to "<imdbRoot>"
        // 3 if "<picFound>", remove the disturbing distinguishing random extension
        //   from most GUI labels but, NOTE: Use it also, e.g. in the Jstree label!
        var nameText = $ ("#imdbDir").text ().replace (/^(.+[/])+/, "");
        if (nameText === $ ("#imdbLink").text ()) {nameText = $ ("#imdbRoot").text ();}
        if (nameText.indexOf (picFound) > -1) nameText = nameText.replace (/^(.+)\.[^.]+$/, "$1");

        var eraseText = "Radera i " + nameText + ":";
        markBorders (picName); // Mark this one
        if (nels === 1) {
          linked = $ ("#i" + escapeDots (picName)).hasClass ("symlink");
        }
        nelstxt = "<b>Vänligen bekräfta:</b><br>" + delNames + "<br>i <b>" + nameText + "<br>ska alltså raderas?</b><br>(<i>kan inte ångras</i>)"; // i18n
        if (linked) {
          if (eraseOriginals) {
            nelstxt += " *<br><span style='color:black;font-weight:bold'>* <span style='color:#d00'>Originalet</span> till <span style='color:green'>länk</span> raderas nu också!</span>"; // #d00 is deep red
          } else {
            nelstxt += "<br><span style='color:green;font-size:85%'>Då <span style='color:green;text-decoration:underline'>länk</span> raderas berörs inte originalet</span>"; // i18n
          }
        }
        $ ("#dialog").html (nelstxt);
        $ ("#dialog").dialog ( { // Initiate a new, confirmation dialog
          title: eraseText,
          closeText: "×",
          autoOpen: false,
          draggable: true,
          modal: true,
          closeOnEscape: true
        });
        $ ("#dialog").dialog ('option', 'buttons', [ // Define button array
        {
          text: "Ja", // Yes
          "id": "yesBut",
          click: function () {
            console.log ("To be deleted: " + delNames); // delNames is picNames as a string
            // NOTE: Must be a 'clean' call (no then or <await>):
            deleteFiles (picNames, nels, picPaths);
            $ (this).dialog ('close');
            later ( ( () => {
              document.getElementById("reLd").disabled = false;
              $ ("#reLd").trigger ("click"); // REFRESH
              scrollTo (null, $ ("#highUp").offset ().top);
            }), 750);
          }
        },
        {
          text: "Nej", // No
          "id": "noBut",
          click: function () {
            console.log ("Untouched: " + delNames);
            $ (this).dialog ('close');
          }
         }]);
        $ ("#noBut").html ("<b>Nej, avbryt</b>");
        niceDialogOpen ();
        $ ("#yesBut").focus ();
      }
    }
  },
  { label: "×", disabled: false, action () {} }, // Spacer closes menu
  ],
  //contextSelection: [{ paramDum: false }],  // The context menu "selection" parameter (not used)
  contextSelection: () => {return {}},
  _contextMenu (e) {
    later ( ( () => {
      // At text edit (ediText) || running slide show
      if ( ($ ("div[aria-describedby='textareas']").css ("display") !== "none") || ($ ("#navAuto").text () === "true") ) {
        $ ("ul.context-menu").hide ();
        return;
      }
      $ ("#dialog").dialog ("close"); // Since a modal initiated with open non-modal => danger!
      $ ("ul.context-menu").hide ();
      var nodelem = e.target;
      if (nodelem.tagName === 'IMG' && nodelem.className.indexOf ('left-click') > -1 || nodelem.parentElement.id === 'link_show') {
        // Set the target image path. If the show-image is clicked the target is likely an
        // invisible navigation link, thus reset to parent.firstchild (= no-op for mini-images):
        let tmp = nodelem.parentElement.firstElementChild.title.trim ()
        $ ("#picOrig").text ($ ("#imdbLink").text () +"/"+ tmp);
        // Set the target image name, which is in the second parent sibling in both cases:
        var namepic = nodelem.parentElement.nextElementSibling.nextElementSibling.innerHTML.trim ();
        $ ("#picName").text (namepic);

        // Ascertain that the minipic is shown (maybe autocreated just now?)
        var toshow = document.getElementById ("i" + namepic).firstElementChild.firstElementChild;
        var minipic = toshow.getAttribute ("src");
        toshow.removeAttribute ("src");
        toshow.setAttribute ("src", minipic);
        //var docLen = document.body.scrollHeight; // <- NOTE: this is the document Ypx height
        //var docWid = document.body.scrollWidth; // <- NOTE: this is the document Xpx width
        // var scrollY = window.pageYOffset; // <- NOTE: the Ypx document coord of the viewport

        $ ("#wormhole-context-menu").css ("position", "absolute"); // Change from fixed

        $ ("div.context-menu-container").css ("position", "relative"); // Change from fixed
        var viewTop = window.pageYOffset; // The viewport position
        var tmpTop = e.clientY;           // The mouse position
        $ ("div.context-menu-container").css ("top", (viewTop + tmpTop) + "px");

        $ ("ul.context-menu").css ("left", "-2px");
        $ ("ul.context-menu").css ("right", "");
        $ ("ul.context-menu.context-menu--left").css ("left", "");
        $ ("ul.context-menu.context-menu--left").css ("right", "2px");
        $ ("ul.context-menu").show ();

      }
    }), 7); /* was 7 */
  },

  // STORAGE FOR THE HTML page population, and other storages
  /////////////////////////////////////////////////////////////////////////////////////////
  // allNames: File names etc. (object array) for the thumbnail list generation
  allNames: () => {return []},
  timer: null,  // The timer for auto slide show
  savekey: -1,  // The last pressed keycode used to lock Ctrl+A etc.
  userDir:  "undefined", // Current server user directory
  imdbLink: "", // Name of the symbolic link to the imdb root directory (from server)
  imdbRoot: "", // The imdb directory (initial default = env.variable $IMDB_ROOT)
  imdbRoots: () => {return []}, // For imdbRoot selection
  imdbDir: "",  // Current picture directory, selected from imdbDirs
  imdbDirs: () => {return ['Albums?']}, // Reset in requestDirs
  imdbPics: () => {return ['Alpics?']}, // Reset in requestDirs
  isLoading: false,
  jstreeHdr: "", // Current album JStree menu header
  albumName: "", // Current album display name, even with HTML tags
  albumText: "", // Current album maintenance menu label
  albumData: () => {return []}, // Directory structure for the selected imdbRoot
  subaList: () => {return []},  // Subalbum links

  // HOOKS, that is, Ember "hooks" in the execution cycle
  /////////////////////////////////////////////////////////////////////////////////////////
  //----------------------------------------------------------------------------------------------
  init () { // ##### Component initiation
    this._super (...arguments);
    $ (document).ready ( () => {

      // Here is the base IMDB_LINK setting, used for imdbLink in ld_imdb.js:
      $ ("#imdbLink").text ("imdb"); // <<<<<<<<<< == IMDB_LINK in routes.js

      $ ("#menuButton").attr ("title", htmlSafe ("Öppna\nmenyn")); // i18n
      // Remember update *.hbs
      $ ("#bkgrColor").text ("rgb(59, 59, 59)"); // #333
      // Set the hidden-picture text background color:
      $ ("#hideColor").text ("rgb(0, 50, 100)");
      // Set body class BACKG:
      $ ("body").addClass ("BACKG TEXTC");
      $ ("body").css ("background", BACKG);
      $ ("body").css ("color", TEXTC);
      $ ("#viSt").hide ();
      later ( ( () => {
        if (!getCookie("bgtheme")) {
          setCookie("bgtheme", "light", 0);
        } else {
          this.actions.toggleBackg (); this.actions.toggleBackg ();
        }
        console.log ("jQuery v" + $ ().jquery);
        // The time stamp is produced with the Bash 'ember-b-script'
        // userLog ($ ("#timeStamp").text (), true); // Confuses phone users
        // Login advice:
        $ ("#title a.proid").attr ("title", homeTip);
        //$ ("#title a.proid").attr ("totip", homeTip);
        $ ("#title a.toggbkg").attr ("title", bkgTip);
        $ ("#title button.cred").attr ("title", logAdv);
        $ ("#title button.cred").attr ("totip", logAdv);
        // Initialize settings:
        // Search result album names will have unique random extensions.
        // This #picFound search result album will, harmlessly, have identical
        // name within a session for any #imdbRoot (if you switch between them)
        let rnd = "." + Math.random().toString(36).substr(2,4);
        $ ("#picFound").text (picFound + rnd); // i18n
        console.log ("picFound:", $ ("#picFound").text ());
        zeroSet ();
        this.actions.setAllow ();
        this.actions.setAllow (true);
        later ( (async () => {
          prepDialog ();
          prepTextEditDialog ();
          prepSearchDialog ();

          let rootList = await reqRoot (); //  Get possible rootdirs
          if (rootList) {
            rootList = rootList.split ("\n");
            let seltxt = rootList [0];
            rootList.splice (0, 1, "");
            rootList [0] = "Välj albumkatalog "; // i18n, must have a space
            let selix = rootList.indexOf (seltxt);
            if (selix > 0) {
              this.set ("imdbRoot", seltxt);
              $ ("#imdbRoot").text (seltxt);
              //let imdbRoot = seltxt;
            }
            this.set ("imdbRoots", rootList);
            rootList = rootList.join ("\n");
            $ ("#imdbRoots").text (rootList);
          }
        }), 25);
        later ( ( () => { // To top of screen:
          scrollTo (0, 0);
          $ ("#title a.proid").focus ();
          later ( ( () => { // Auto log in the default guest user:
            $ (".cred.user").attr ("value", "gäst"); // i18n
            $ (".cred.login").trigger ("click");
            later ( ( () => {
              $ (".cred.login").trigger ("click"); // Confirm logIn
              $ (".cred.user").trigger ("click"); // Prevents FF showing link to saved passwords
              $ ("#title a.proid").focus ();
              //this.actions.selectRoot ("");
            }), 1000);
          }), 1000);
        }), 200);
      }), 200);
    });
    // Trigger the jQuery tooltip on 'totip="..."' (custom attribute)
    $ (function () {
      $ (document).tooltip ({
        items: "[totip]",
        content: function () {
          var elem = $ (this);
          if (elem.is ("[totip]")) {
            return elem.attr ("totip");
          }
        },
        show: {
          //effect: "slideDown",
          effect: "blind",
          //duration: 0, do not use
          delay: 0
          //effect: "fade"
        },
        position: {
          my: "left top+2",
          at: "left bottom"
        },
        close: function () {
          // Clean upp tooltip garbage and hide new tooltip text down below:
          $ ("div.ui-helper-hidden-accessible").html ("");
          $ ("div.ui-helper-hidden-accessible").attr ("style", "position:fixed;top:8192px");
        }
      });
      $ (document).tooltip ("disable");
    });
  },
  //----------------------------------------------------------------------------------------------
  didInsertElement () { // ##### Runs at page ready state
    this._super (...arguments);

    this.setNavKeys ();

    execute ("head -n1 LICENSE.txt").then (a => {
      $ (".copyright").text (a);
     });
  },
  //----------------------------------------------------------------------------------------------
  didRender () {
    this._super (...arguments);
    $ (document).ready ( () => {

      devSpec ();
      $ (".BACKG").css ("background", BACKG);
      $ (".TEXTC").css ("color", TEXTC);
      $ (".BLUET").css ("color", BLUET);

      if ($ ("#hideFlag").text () === "1") {
        this.actions.hideFlagged (true).then (null);
      } else {
        this.actions.hideFlagged (false).then (null);
      }

      later ( ( () => {
        // Update the slide show speed factor when it is changed
        document.querySelector ('input.showTime[type="number"]').addEventListener ('change', function () {$ ("#showFactor").text (parseInt (this.value));});

        $ ("span#showSpeed").hide ();
        $ ("div.ember-view.jstree").attr ("onclick", "return false");

        /*if (allow.imgHidden || allow.adminAll) { // Qualified if at least Guest
          $ (".img_mini.symlink [alt='MARKER']").attr("title", "Klick = markera; med Ctrl eller högerklick = till originalet");
        }*/
      }), 10);
    });
  },

  // HELP FUNCTIONS, that is, component methods (within-component functions)
  /////////////////////////////////////////////////////////////////////////////////////////
  //----------------------------------------------------------------------------------------------
  refreshAll () {
    // ===== Updates allNames and the sortOrder tables by locating all images and
    // their metadata in the <imdbDir> dir (name is DOM saved) on the server disk.
    // This will trigger the template to restore the DOM elements. Prepare the didRender hook
    // to further restore all details!
    return new Promise (resolve => {
      var test = 'A1';
      //$.spinnerWait (true);console.log(test);
      this.requestOrder ().then (sortnames => {
        if (sortnames === undefined) {sortnames = "";}
        if (sortnames === "Error!") {
          $ (".mainMenu").show ();
          if ($ ("#imdbDir").text () !== "") {
            document.getElementById ("imdbError").className = "show-inline";
          }
          $ ('.showCount').hide ();
          $ ("#imdbDir").text ("");
          $ ("#sortOrder").text ("");
          $ ('#navKeys').text ('true');
        } else {
          $ ('.showCount:last').hide ();
          $ ("#sortOrder").text (sortnames); // Save in the DOM
        }
        test = 'A2';
        //$.spinnerWait (true);console.log(test);
        var n=0;
        // Use sortOrder (as far as possible) to reorder namedata ERROR
        // First pick out namedata (allNames) against sortnames (SN), then any remaining
        this.requestNames ().then (namedata => {
          var i = 0, k = 0;
          // --- Start prepare sortnames checking CSV columns
          var SN = [];
          if ($ ("#sortOrder").text ().trim ().length > 0) {
            SN = $ ("#sortOrder").text ().trim ().split ('\n');
          }
          //console.log("NOTE: SN is the latest saved list of images, not nesseceraly reflecting the actual directory content (must have been saved to do that):",SN);
          sortnames = '';
          for (i=0; i<SN.length; i++) {
            var tmp = SN [i].split (",");
            if (tmp [0].slice (0, 1) !== ".") {
              if (tmp.length < 2) {
                tmp.push (" ");
                SN [i] = SN [i] + ",";
              }
              if (tmp [1].trim ().length === 0) {SN [i] = SN [i] + '0';}
              if (tmp.length < 3) {
                tmp.push (" ");
                SN [i] = SN [i] + ",";
              }
              if (tmp [2].trim ().length === 0) {SN [i] = SN [i] + '0';}
              sortnames = sortnames +'\n'+ SN [i];
            }
          }
          test = 'A3';
          sortnames = sortnames.trim (); // Important!
          if (sortnames === "") {
            var snamsvec = [];
          } else {
            snamsvec = sortnames.split ('\n'); // sortnames vectorized
          }
          // --- Pull out the plain sort order file names: snams <=> sortnames
          var snams = [];
          // snamsvec is sortnames vectorized
          for (i=0; i<snamsvec.length; i++) {
            // snams is kind of 'sortnames.name'
            snams.push (snamsvec [i].split (",") [0]);
          }
          // --- END prepare sortnames
          //$.spinnerWait (true);console.log(test);
          // --- Pull out the plain dir list file names: name <=> namedata (undefined order)
          if (namedata === undefined) {namedata = [];}
          var name = [];
          for (i=0; i<namedata.length; i++) {
            name.push (namedata [i].name);
          }
          test ='B';
          // --- Make the object vector 'newdata' for new 'namedata=allNames' content
          // --- Use 'snams' order to pick from 'namedata' into 'newdata' and 'newsort'
          // --- 'namedata' and 'name': Ordered as from disk (like unknown)
          var newsort = "", newdata = [];
          while (snams.length > 0 && name.length > 0) {
            k = name.indexOf (snams [0]);
            if (k > -1) {
              newsort = newsort + snamsvec [0] + "\n";
              newdata.pushObject (namedata [k]);
              namedata.removeAt (k, 1);
              name.splice (k, 1);
            }
            snamsvec.splice (0, 1);
            snams.splice (0, 1);
          }
          test ='C';
          // --- Move remaining 'namedata' objects (e.g. uploads) into 'newdata' until empty.
          // --- Place them first to get better noticed. Update newsort for sortnames.
          // --- The names, of such (added) 'namedata' objects, are kept remaining in 'name'??
          //$.spinnerWait (true);console.log(test);
          while (namedata.length > 0) {
            newsort = namedata [0].name + ",0,0\n" + newsort;
            //newdata.pushObject (namedata [0]); instead:
            newdata.insertAt (0, namedata [0]);
            namedata.removeAt (0, 1);
          }

          n = newdata.length;
          // Transform the elements for HBS template use:
          //$.spinnerWait (true);console.log(test);
          for (i=0; i<n; i++) {
            newdata [i].linkto = newdata [i].orig; // Added, see requestNames, 'row number eight'
            if (newdata [i].symlink === "&") {
              newdata [i].symlink = "";
            } else {
              newdata [i].orig = newdata [i].symlink;
              newdata [i].symlink = "symlink";
            }
          }

          newsort = newsort.trim (); // Important
          test ='E0';
          this.set ("allNames", newdata); // The minipics reload is triggered here (RELOAD)
          //$.spinnerWait (true);console.log(test);
          $ ('#sortOrder').text (newsort); // Save in the DOM
          //console.log("NOTE: newsort is the true list of images in the actual directory:",newsort.split("\n"));
          //console.log("NOTE: newdata will trigger the thumbnails reload:",this.get ("allNames"));
          preloadShowImg = []; // Preload show images:
          let nWarn = 100;
          for (i=0; i<n; i++) {
            preloadShowImg [i] = new Image();
            preloadShowImg [i].src = newdata [i].show;
          }
          //$.spinnerWait (true);console.log(test);
          if ( (n > nWarn) && (allow.imgUpload || allow.adminAll)) {
            infoDia (null, null, "M Ä N G D V A R N I N G", "<b>Ett album bör av alla möjliga <br>praktiska och tekniska skäl inte ha <br>särskilt många fler än etthundra bilder. <br>Försök att dela på det här albumet ...</b>", "... uppfattat!", true);
          }
          if (n > 0) {
            $ (".numMarked").text (" " + $ (".markTrue").length);
            if ($ ("#hideFlag") === "1") {
              $ (".numHidden").text (" " + $ (".img_mini [backgroundColor=$('#hideColor')]").length);
              // DOES THIS WORK OR MAY IT BE REMOVED? It seems to work.
              $ (".numShown").text (" " + $ (".img_mini [backgroundColor!=$('#hideColor')]").length);
            } else {
              $ (".numHidden").text ("0");
              $ (".numShown").text ($ (".img_mini").length);
            }

            //$.spinnerWait (true);console.log(test);
            later ( ( () => {
              if (document.querySelector("strong.albumName") && document.querySelector ("strong.albumName") [0] && document.querySelector ("strong.albumName") [0].innerHTML.replace (/&nbsp;/g, " ").trim () === $ ("#picFound").text ().replace (/\.[^.]{4}$/, "").replace (/_/g, " ")) {
                // The search result album. Seems to fail, may be removed since also superfluous?
                $ ("div.BUT_2").html ($.parseHTML ('<span style="color:#0b0";font-weight:bold>Gå till bildens eget album med högerklick i grön ring!</span>'));
              } else {
                let ntot = $ (".img_mini").length;
                let nlink = $ (".img_mini.symlink" ).length;
                //console.log(ntot,nlink);
                let ntext = $ ("div.BUT_2").text ().replace (/(^[^,]*),.*$/, "$1");
                let nown = ntot - nlink;
                if (nown === 1) {
                  ntext += ", 1 bild";
                } else {
                  ntext += ", " + nown + " bilder";
                } // i18n
                let ltext = " länkade";
                if (nlink === 1) {ltext = " länkad";}
                if (nlink > 0) {
                  if (nown === 1) {
                    ntext += " (egen) + " + nlink + ltext;
                  } else {
                    ntext += " (egna) + " + nlink + ltext;
                  }
                } // i18n
                $ ("div.BUT_2").text (ntext);
              }
              //$.spinnerWait (true);console.log(test);
            }), 777);

            //$.spinnerWait (true);console.log(test);
            userLog ("RELOAD");
          } else {
            later ( ( () => {
              let ntext = $ ("div.BUT_2").text ().replace (/(^[^,]*),.*$/, "$1");
              $ ("div.BUT_2").text (ntext);
              //if ($ ("strong.albumName") [0].innerHTML.replace (/&nbsp;/g, " ") === $ ("#picFound").text ().replace (/_/g, " ")) {
              if (document.querySelector("strong.albumName") && document.querySelector ("strong.albumName") [0] && document.querySelector ("strong.albumName") [0].innerHTML.replace (/&nbsp;/g, " ") === $ ("#picFound").text ().replace (/\.[^.]{4}$/, "").replace (/_/g, " ")) {
                $ ("div.BUT_2").text (""); // The search result album
              }
              //$.spinnerWait (true);console.log(test);
            }), 777);
            //$.spinnerWait (true);console.log(test);
          }
          test = 'E1';
          later ( ( () => {
            if ($ ("#hideNames").text () === "1") {
              $ (".img_name").hide ();
            } else {
              $ (".img_name").show ();
            }
          }), 20);
          //$.spinnerWait (true);console.log(test);
          later ( ( () => {
            $ ("#saveOrder").trigger ("click");
            //$.spinnerWait (true);console.log(test);
          }), 200);
        }).catch (error => {
          console.error (test + ' in function refreshAll: ' + error.message);
        });
      }).catch ( () => {
        console.log ("Not found");
      });
      $ ('#navKeys').text ('true');
      resolve (test);
    });
  },
  //----------------------------------------------------------------------------------------------
  setNavKeys () { // ===== Trigger actions.showNext when key < or > is pressed etc...

    var triggerClick = (evnt) => {
      var that = this;
      var tgt = evnt.target;
      let tgtClass = "";
      if (tgt) {
        tgtClass = tgt.classList [0] || "";
      }
      if (tgtClass === "context-menu" || tgtClass === "spinner") {
        return;
      }
      if (tgt.id === "wrap_pad") {
        that.actions.hideShow ();
        return;
      }
      if (!tgt.parentElement) return; // impossible
      if (tgt.tagName !=="IMG" && tgt.parentElement.firstElementChild.tagName !== "IMG") return;

      // Ctrl + click may replace right-click on Mac
      if (evnt.ctrlKey) {
        if ($ (tgt).hasClass ("mark")) {
          if (allow.imgHidden || allow.adminAll) {
            // Right click on the marker area of a thumbnail...
            parentAlbum (tgt);
          }
          return;
        }
        $(tgt.parentElement.firstElementChild).trigger('contextmenu');
        // Have to be repeated because of this extra contextmenu trigging. Keeps the menu
        // by the pointer for both rightclick, Ctrl + rightclic, and Ctrl + leftclick:
        var viewTop = window.pageYOffset; // The viewport position
        var tmpTop = evnt.clientY;           // The mouse position
        $ ("div.context-menu-container").css ("top", (viewTop + tmpTop) + "px");
        var viewLeft = window.pageXOffset; // The viewport position
        var tmpLeft = evnt.clientX;           // The mouse position
        $ ("div.context-menu-container").css ("left", (viewLeft + tmpLeft) + "px");
        return;
      }
      /*if ($ (tgt).hasClass ("mark")) {
        if ( evnt.button === 2 && (allow.imgHidden || allow.adminAll)) {
          // Right click on the marker area of a thumbnail...
          parentAlbum (tgt);
        }
        return;
      }*/
      if (evnt.button === 2) return; // ember-context-menu should take it
      var namepic = tgt.parentElement.parentElement.id.slice (1);

      // Check if the intention is to "mark" (Shift + click):
      if (evnt.shiftKey) {
        later ( ( () => {
          that.actions.toggleMark (namepic);
          return;
        }), 20);
      } else {
        // A mini-picture is classless
        if (tgt.parentElement.className || tgt.parentElement.id === "link_show") return;
        var origpic = $ ("#imdbLink").text () + "/" + tgt.title;
        var minipic = tgt.src;
        var showpic = minipic.replace ("/_mini_", "/_show_");
        document.getElementById ("divDropbox").className = "hide-all";
        this.actions.showShow (showpic, namepic, origpic);
        return;
      }
    }
    document.addEventListener ("click", triggerClick, false); // Click (at least left click)
    document.addEventListener ("contextmenu", triggerClick, false); // Right click

    // Then the keyboard, actions.showNext etc.:
    var that = this;
    function triggerKeys (event) {
      var Z = false; // Debugging switch
      if (event.keyCode === 112) { // F1 key
        that.actions.toggleHelp ();
      } else
      if (event.keyCode === 27) { // ESC key
        // If #navAuto is true, runAuto will be stopped if it is running
        // (with no dialogs open). Else, #navAuto SHOULD be false, anyhow!
        $ ("#navAuto").text ("false");
        $ (".mainMenu").hide ();
        $ ("iframe.intro").hide ();
        $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
        if ($ ("div.settings").is (":visible")) { // Hide settings
          $ ("div.settings, div.settings div.check").hide ();
          return;
        }
        if (document.getElementById ("divDropbox").className !== "hide-all") { // Hide upload
          document.getElementById ("divDropbox").className = "hide-all";
          return;
        }
        if ($ ("#notes").is (":visible")) {
          $ ("#notes").dialog ("close");
        } else
        if ($ ("#dialog").is (":visible")) {
          $ ("#dialog").dialog ("close");
          $ ('#navKeys').text ('true'); // Reset if L/R arrows have been protected
        } else
        if ($ ("div[aria-describedby='textareas']").css ("display") !== "none") { // At text edit, visible
          ediTextClosed ();
          if (Z) {console.log ('*a');}
        } else // Carefylly here: !== "none" is false if the context menu is absent!
        if ($ ("ul.context-menu").css ("display") === "block") { // When context menu EXISTS and is visible
          $ ("ul.context-menu").hide ();
          if (Z) {console.log ('*b');}
        } else
        if ($ ("#link_show a").css ('opacity') > 0) { // The navigation help is visible
          $ ("#link_show a").css ('opacity', 0);
          if (Z) {console.log ('*c');}
        } else
        if ($ (".toggleAuto").text () === "STOP") { // Auto slide show is running
          later ( ( () => {
            $ (".nav_links .toggleAuto").text ("AUTO");
            $ (".nav_links .toggleAuto").attr ("title", "Avsluta bildbyte [Esc]"); //i18n
            that.runAuto (false);
          }), 100);
          if (Z) {console.log ('*d');}
        } else
          if ($ (".img_show").css ("display") === "block") { // Show image is visible
          that.actions.hideShow ();
          if (Z) {console.log ('*e');}
        } else {
          resetBorders (); // Reset all borders
        }
        if (Z) {console.log ('*f');}
      } else
      if (event.keyCode === 37 && $ ("#navKeys").text () === "true" &&
      $ ("div[aria-describedby='searcharea']").css ("display") === "none" &&
      $ ("div[aria-describedby='textareas']").css ("display") === "none" &&
      !$ ("textarea.favorites").is (":focus") &&
      !$ ("input.cred.user").is (":focus") &&
      !$ ("input.cred.password").is (":focus")) { // Left key <
        event.preventDefault(); // Important!
        that.actions.showNext (false);
        if (Z) {console.log ('*g');}
      } else
      if (event.keyCode === 39 && $ ("#navKeys").text () === "true" &&
      $ ("div[aria-describedby='searcharea']").css ("display") === "none" &&
      $ ("div[aria-describedby='textareas']").css ("display") === "none" &&
      !$ ("textarea.favorites").is (":focus") &&
      !$ ("input.cred.user").is (":focus") &&
      !$ ("input.cred.password").is (":focus")) { // Right key >
        event.preventDefault(); // Important!
        that.actions.showNext (true);
        if (Z) {console.log ('*h');}
      } else
      if (that.savekey !== 17 && event.keyCode === 65 && // A key
      $ ("#navAuto").text () !== "true" &&
      $ ("div[aria-describedby='searcharea']").css ("display") === "none" &&
      $ ("div[aria-describedby='textareas']").css ("display") === "none" &&
      !$ ("input.i_address").is (":visible") && // Contact message mail dialog
      !$ ("textarea.favorites").is (":focus") &&
      !$ ("input.cred.user").is (":focus") &&
      !$ ("input.cred.password").is (":focus")) {
        if (!($ ("#imdbDir").text () === "")) {
          $ ("#dialog").dialog ("close");
          later ( ( () => {
            $ ("#navAuto").text ("false");
            if (Number ($ (".numShown:first").text ()) > 1) {
              $ ("#navAuto").text ("true");
              $ (".nav_links .toggleAuto").text ("STOP");
              $ (".nav_links .toggleAuto").attr ("title", "Avsluta bildbyte [Esc]"); //i18n
              that.runAuto (true);
            }
          }), 250);
          if (Z) {console.log ('*i');}
        }
      } else
      if (that.savekey !== 17 && event.keyCode === 70 && // F key
      $ ("#navAuto").text () !== "true" &&
      $ ("div[aria-describedby='searcharea']").css ("display") === "none" &&
      $ ("div[aria-describedby='textareas']").css ("display") === "none" &&
      !$ ("input.i_address").is (":visible") && // Contact message mail dialog
      !$ ("textarea.favorites").is (":focus") &&
      !$ ("input.cred.user").is (":focus") &&
      !$ ("input.cred.password").is (":focus")) {
        if (!($ ("#imdbDir").text () === "")) {
          later ( ( () => {
            that.actions.findText ();
          }), 250);
          if (Z) {console.log ('*j');}
        }
      } else
      if (that.savekey === 17 && event.keyCode === 83) { // Ctrl + S (for saving texts)
        event.preventDefault(); // Important!
        if ($ ("button.saveNotes").is (":visible")) {
          $ ("button.saveNotes").trigger ("click");
        } else
        if ($ ("button.saveTexts").is (":visible") && !$ ("button.saveTexts").attr ("disabled")) {
          $ ("button.saveTexts:first").trigger ("click");
        }
        that.savekey = event.keyCode;
      } else {
        that.savekey = event.keyCode;
      }
    }
    document.addEventListener ('keydown', triggerKeys, false);
  },
  //----------------------------------------------------------------------------------------------
  runAuto (yes) { // ===== Help function for toggleAuto
    if (Number ($ (".numShown:first").text ()) < 2) return;
    if (yes) {
      ediTextClosed ();
      $ ("#showSpeed").show ();
      userLog ('BEGIN show');
      //$ ("#showSpeed input").focus (); Fatal for phones!
      var that = this;
      (function sequence () {
        that.actions.showNext (true); // Immediate response
        var showFactor = parseInt ($ ("#showFactor").text ());
        if (showFactor < 1) {showFactor = 0.5;}
        if (showFactor > 99) {showFactor = 99;}
        var txlen = $ ("#wrap_show .img_txt1").text ().length + $ ("#wrap_show .img_txt2").text ().length;
        if (!txlen) {txlen = 0;}
        if (txlen < 100) {txlen = 100;} // 100 char
        if (txlen > 1000) {txlen = 1000;} // 1000 char
        var ms;
        if ($ (".nav_links span a.speedBase").css ('color') === 'rgb(255, 20, 147)') { // deeppink
          ms = 14*txlen;
        } else {
          ms = 1000;
        }
        that.timer = setTimeout (sequence, showFactor*ms);
      } ());
    } else {
      clearTimeout (this.timer);
      $ ("#showSpeed").hide ();
      userLog ('END show');
    }
  },
  //----------------------------------------------------------------------------------------------
  requestOrder () { // ===== Request the sort order list
    return new Promise ( (resolve, reject) => {
      var IMDB_DIR =  $ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For passing sub-directories
      var that = this;
      var xhr = new XMLHttpRequest ();
      xhr.open ('GET', 'sortlist/' + IMDB_DIR, true, null, null); // URL matches server-side routes.js
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.responseText.trim ();
          if (data.slice (0, 8) === '{"error"') {
            //data = undefined;
            data = "Error!"; // This error text may also be generated elsewhere
          }
          var tmpName = that.get ("albumName");
          tmpName = extractContent (tmpName); // Don't accumulate HTML
          if (tmpName === that.get ("imdbRoot")) {
            document.title = 'Mish: ' + removeUnderscore (that.get ("imdbRoot"), true);
          } else {
            // Do not display the random suffix if this is the search result album
            var tmpIndex = tmpName.indexOf (picFound);
            if (tmpIndex === 0) {
              tmpName = tmpName.replace (/\.[^.]{4}$/, "");
            }
            document.title = 'Mish: ' + removeUnderscore (that.get ("imdbRoot") + " — " + tmpName, true);
          }
          tmpName = removeUnderscore (tmpName); // Improve readability
          that.set ("jstreeHdr", "");
          if (data === "Error!") {
            if (tmpIndex === 0) { // Regenerate the picFound album since it has probably timed out
              let lpath = $ ("#imdbLink").text () + "/" + $ ("#picFound").text ();
              execute ("rm -rf " +lpath+ "&&mkdir -m0775 " +lpath+ "&&touch " +lpath+ "/.imdb&&chmod 664 " +lpath+ "/.imdb").then ();
            } else {
              tmpName += " &mdash; <em style=\"color:red;background:transparent\">just nu oåtkomligt</em>" // i18n
              that.set ("albumName", tmpName);
              $ ("#imdbDir").text ("");
            }
          } else {
            that.set ("albumText", " Albumåtgärder");
            that.set ("albumName", '<strong class="albumName"> ' + tmpName + '</strong>');
            that.set ("jstreeHdr", "Alla album (albumkarta, albumträd):");
            $ ("#jstreeHdr").attr ("title", htmlSafe ("Visa alla album\n(hela albumträdet)")); //i18n
          }
          resolve (data); // Return file-name text lines
          console.log ("ORDER received");
        } else {
          resolve ("Error!");
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        resolve ("Error!");
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    }).catch (error => {
      console.error (error.message);
    });
  },
  //----------------------------------------------------------------------------------------------
  requestNames () { // ===== Request the file information list
    // NEPF = number of entries (lines) per file in the plain text-line-result list ('namedata')
    // from the server. The main information is retreived from each image file, e.g.
    // metadata. It is reordered into 'newdata' in 'sortnames' order, as far as possible;
    // 'sortnames' is cleaned from non-existent (removed) files and extended with new (added)
    // files, in order as is. So far, the sort order is 'sortnames' with hideFlag (and albumIndex?)
    var that = this;
    return new Promise ( (resolve, reject) => {
      var IMDB_DIR =  $ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
      var xhr = new XMLHttpRequest ();
      xhr.open ('GET', 'imagelist/' + IMDB_DIR, true, null, null); // URL matches server-side routes.js
      var allfiles = [];
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var Fobj = EmberObject.extend ({
            orig: '',  // for orig-file path (...jpg|tif|png|...)
            show: '',  // for show-file path (_show_...png)
            mini: '',  // for mini-file path (_mini_...png)
            name: '',  // Orig-file base name without extension
            txt1: 'description', // for metadata
            txt2: 'creator',     // for metadata
            symlink: ' ',        // SPACE, else the value for linkto
            linkto: ''           //   which is set in refreshAll
          });
          var NEPF = 7; // Number of properties in Fobj
          var result = xhr.responseText;
          result = result.trim ().split ('\n'); // result is vectorised
          var i = 0, j = 0;
          var n_files = result.length/NEPF;
          if (n_files < 1) { // Covers all weird outcomes
            result = [];
            n_files = 0;
            $ ('.showCount .numShown').text (' 0');
            $ ('.showCount .numHidden').text (' 0');
            $ ('.showCount .numMarked').text ('0');
            $ ("span.ifZero").hide ();
            $ ('#navKeys').text ('false'); // Prevents unintended use of L/R arrows
          }
          for (i=0; i<n_files; i++) {
            if (result [j + 4]) {result [j + 4] = result [j + 4].replace (/&lt;br&gt;/g,"<br>");}
            var f = Fobj.create ({
              orig: result [j],
              show: result [j + 1],
              mini: result [j + 2],
              name: result [j + 3],
              txt1: htmlSafe (result [j + 4]),
              txt2: htmlSafe (result [j + 5]),
              symlink: result [j + 6],
            });
            if (f.txt1.toString () === "-") {f.txt1 = "";}
            if (f.txt2.toString () === "-") {f.txt2 = "";}
            j = j + NEPF;
            allfiles.pushObject (f);
          }
          later ( ( () => {
            $ (".showCount:first").show ();
            $ (".miniImgs").show ();
            if (n_files < 1) {
              $ ("#toggleName").hide ();
              $ ("#toggleHide").hide ();
            }
            else {
              $ ("#toggleName").show ();
              if (allow.adminAll || allow.imgHidden) $ ("#toggleHide").show ();
            }
            later ( ( () => {
              that.actions.setAllow (); // Fungerar hyfsat ...?
            }), 2000);
          }), 2000);
          //userLog ('INFO received');
          resolve (allfiles); // Return file-list object array
        } else {
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    })
    .then ()
    .catch (error => {
      console.error ("requestNames", error.message);
    });
  },
  //----------------------------------------------------------------------------------------------
  printThis: Ember.inject.service (), // ===== For the 'doPrint' function

  // TEMPLATE ACTIONS, functions reachable from the HTML page
  /////////////////////////////////////////////////////////////////////////////////////////
  actions: {
    //============================================================================================
    doPrint () { // PDF print a show picture and its text (for A4 portrait)
      const selector = "#wrap_pad";
      const options = {
        debug: false,
        importStyle: true,
        loadCSS: "printthis.css",
        printContainer: false,
        pageTitle: "&nbsp;&nbsp;&nbsp;" + $ ("#wrap_pad .img_name").text () + " : " + $ ("#imdbRoot").text () + $ ("#imdbDir").text ().replace (/^[^/]+/, ""),
      };
      this.get("printThis").print(selector, options);
    },
    //============================================================================================
    doMail () { // Send a message 'from a picture'
      if ($ ("input.i_address").is (":visible")) {
        $ ("#dialog").dialog ("close"); // Close if open
        return;
      }
      let user = $ ("#title span.cred.name").text ();
      let picName = $ ("#picName").text ();
      let tmp = extractContent (this.get ("albumName")).replace (/\s/g, "_");
      if (tmp.indexOf (picFound) === 0) picName = picName.replace (/\.[^.]{4}$/, "");
      let title = "Mejl från Mish, <b style='background:inherit'>" + user + "/" + picName + "</b>"; // i18n
      let text = 'Skriv ditt meddelande till Sävar Hembygdsförening:';
      text += '<br><input type="text" class="i_address" title="" placeholder=" Namn och adress (frivilligt)" value="' + '' + '" style="width:100%;background:#f0f0cf;margin: 0.5em 0 0 0">';
      text += '<br><input type="email" class="i_email" title="" placeholder=" Din epostadress (obligatoriskt, visas ej)" value="' + '' + '" style="width:100%;background:#f0f0b0;margin: 0.5em 0 0 0">';
      text += '<br><textarea class="t_mess" rows="6"  title="" placeholder=" Meddelandetext om minst sju tecken (obligatoriskt)" value="' + '' + '" style="width:100%;background:#f0f0b0;color:blue;margin: 0.5em 0 0.5em 0"></textarea><br>Skriv också om du saknar något eller hittar fel i en bildtext – tack! Och berätta om du vill bidra med egna bilder. Det du skriver här kan bara ses av Hembygdsföreningens mejlmottagare.';

      let yes = "Skicka";
      let no = "Avbryt";
      $ ('#navKeys').text ('false'); // Prevents prev/next-picture use of L/R arrows
      let dialogId = "dialog";
      let id = "#" + dialogId;
      $ (id).dialog ( { // Initiate dialog
        title: "", // html set below /#/
        closeText: "×",
        autoOpen: false,
        draggable: true,
        modal: false,
        closeOnEscape: true,
      });
      later ( ( () => {
        $ (id).html (text);
        // Define button array
        $ (id).dialog ('option', 'buttons', [
        {
          text: yes,
            id: "sendBut",
          click: function () {
            let from = document.querySelector ("input.i_address").value.trim ().replace (/\s+/g, " ");
            let email = document.querySelector ("input.i_email").value;
            if (emailOk (email)) {
              $ ("input.i_email").css ("background", "#dfd");
            } else {
              $ ("input.i_email").css ("background", "#fdd");
              $ ("input.i_email").focus ();
              //$ ('#navKeys').text ('false'); // Repeated since non-modal
              return;
            }
            let message = document.querySelector ("textarea.t_mess").value.trim ().replace (/\s+/g, " ");
            if (message.length < 7) {
              $ ("textarea.t_mess").css ("background", "#fdd");
              $ ("textarea.t_mess").focus ();
              //$ ('#navKeys').text ('false'); // Repeated since non-modal
              return;
            }
            $ (this).dialog ("close");
            $ ('#navKeys').text ('true'); // Reset when L/R arrows have been protected
            // Send email from server
            let data = new FormData ();
            data.append ("title", extractContent (title));
            data.append ("username", user);
            data.append ("picturename", picName);
            data.append ("mailtoadmin", mailAdmin);
            data.append ("from", from);
            data.append ("email", email);
            data.append ("message", message);
            return new Promise ( (resolve, reject) => {
              let xhr = new XMLHttpRequest ();
              xhr.open ('POST', 'contact/')
              xhr.onload = function () {
                resolve (xhr.responseText); // empty
              };
              xhr.onerror = function () {
                resolve (xhr.statusText);
                reject ({
                  status: this.status,
                  statusText: xhr.statusText
                });
              };
              xhr.send (data);
              infoDia (null, null, title, "<br>Ditt meddelande är skickat!", "Ok"); // i18n
            });
          }
        },
        {
          text: no,
            id: "cancelBut",
          click: function () {
            $ (this).dialog ("close");
            $ ('#navKeys').text ('true'); // Reset when L/R arrows have been protected
            //return;
          }
        }]);
        $ ("div[aria-describedby='" + dialogId + "'] span.ui-dialog-title").html (title); /#/
        niceDialogOpen (dialogId);
      }), 33);
      later ( ( () => {
        $ ("input.i_address").focus ();
      }), 333);
    },
    //============================================================================================
    infStatus () { // ##### Display permissions with the picture allow.jpg
      var title = "Information om användarrättigheter"; // i18n
      var text = '<img src="allow.jpg" title="Användarrätigheter">'; // i18n
      var yes = "Ok" // i18n
      infoDia (null, null, title, text, yes, false);
    },
    //============================================================================================
    setAllow (newSetting) { // ##### Updates settings checkbox menu and check reordering attributes
      allowvalue = $ ("#allowValue").text ();
      var n = allowvalue.length;

      if (newSetting) { // Uppdate allowvalue from checkboxes
        var a = "";
        for (var i=0; i<n; i++) {
          var v = String (1 * $ ('input[name="setAllow"]') [i].checked);
          a += v;
        }
        allowvalue = a;
        $ ("#allowValue").text (allowvalue);
      }

      function code (i, j) {
        if (i) {
          return '<input id="c' + (j + 1) + '" type="checkbox" name="setAllow" checked value=""><label for="c' + (j + 1) + '"></label>';
        } else { // The label tags are to satisfy a CSS:checkbox construct, see app.css
          return '<input id="c' + (j + 1) + '" type="checkbox" name="setAllow" value=""><label for="c' + (j + 1) + '"></label>';
        }
      }
      var allowHtml = [];
      for (var j=0; j<n; j++) {
        // Original
        //allowHtml [j] = "<span>allow." + allowance [j] + " " + (j + 1) + ' </span>' + code (Number (allowvalue [j]), j);
        // Swedish
        allowHtml [j] = "<span>" + allowSV [j] + " " + (j + 1) + ' </span>' + code (Number (allowvalue [j]), j); // i18n
      }
      $ ("#setAllow").html ( allowHtml.join ("<br>"));


      allowFunc ();

      if (newSetting) { // Allow only one confirmation per settings-view
        disableSettings ();
        later ( ( () => {
          $ ("div.settings, div.settings div.check").hide ();
        }), 500);
      }

      if (allow.imgReorder || allow.adminAll) { // Allow reorder and ...
        $ ("div.show-inline.ember-view").attr ("draggable", "true");
        $ ("div.show-inline.ember-view").attr ("onmousedown", "return true");
      } else { // ... disallow reorder, onmousedown setting is important!
        $ ("div.show-inline.ember-view").attr ("draggable", "false");
        $ ("div.show-inline.ember-view").attr ("onmousedown", "return false");
      }
      $ ("div.settings button.confirm").blur (); // Important in some situations
    },
    //============================================================================================
    albumEdit () { // ##### Erase or create (sub)albums (image folders)

      var imdbDir = $ ("#imdbDir").text ();
      if (imdbDir === "—" || imdbDir === "") return;
      // Extract the album name and replace &nbsp; with space:
      var album = $ (this.get ("albumName")).text ().replace (/\s/g, " ");
      var album1 = $ ("#picFound").text ().replace (/_/g, " ");
      if ( (!(allow.albumEdit || allow.adminAll)) || album === album1) {
        userLog ("RÄTTIGHET SAKNAS", true, 1000);
        return;
      }
      $ (".mainMenu").hide ();
      $ ("iframe.intro").hide ();
      $ (".img_show").hide ();
      $ (".nav_links").hide ();
      var imdbRoot = $ ("#imdbRoot").text ();
      if (imdbDir.indexOf ("/") < 0) {
        imdbDir = imdbRoot;
      } else {
        imdbDir = imdbDir.replace (/^[^/]*\//, imdbRoot + "/");
      }

      $ ("#temporary").text ("");
      $ ("#temporary_1").text ("");
      // The code in this dialog will indirectly call albumEditOption () onchange:
      var code0 = '<span>' + imdbDir + '</span><br>';
      code0 += '<select class="selectOption" onchange=';
      code0 += "'$ (\"#temporary\").text (this.value);$ (\"#albumEditOption\").trigger (\"click\");return false'>";
      var code = code0 + '\n<option value="">&nbsp;Välj åtgärd för albumet&nbsp;</option>';
      if (imdbDir.indexOf (picFound) < 0) {
        code += '\n<option value="new">&nbsp;Gör ett nytt underalbum  &nbsp;</option>';
      }
      if (imdbDir !== imdbRoot && imdbDir.indexOf (picFound) < 0) {
        code += '\n<option value="erase">&nbsp;Radera albumet&nbsp;</option>';
      }
      if ($ (".img_mini").length > 1) {
        code += '\n<option value="order">&nbsp;Sortera bilderna efter namn&nbsp;</option>';
        code += '\n<option value="reverse">&nbsp;Sortera bilderna baklänges&nbsp;</option>';
      } else if (imdbDir.indexOf (picFound) > -1) {
        code = code0 + '\n<option value="">&nbsp;Albumet kan inte åtgärdas!&nbsp;</option>';
      }
      code += '\n</select>';
      infoDia (null, null, album, code, 'Avbryt', true);
      later ( ( () => {
        $ ("select.selectOption").focus ();
      }), 50);
    },
    //============================================================================================
    albumEditOption () { // Executes albumEdit()'s selected option
      var opt = $ ("#temporary").text ();
      var chkName = $ ("#temporary_1").text ();
      var nameText = $ ("#imdbDir").text ().replace (/^(.+[/])+/, "");
      if (nameText === $ ("#imdbLink").text ()) {nameText = $ ("#imdbRoot").text ();}
      var header, optionText, okay, cancel;
      if (opt) {
        if (opt === "new" || opt === "checked") {
          header = nameText;
          optionText = "Lägg till ett nytt underalbum i <b>" + nameText + "</b><br>";
          optionText += "Välj det nya albumnamnet:<br>";
          optionText += '<input type="text" class="cred user nameNew" size="36" title="" placeholder="skriv albumnamn" value="' + chkName + '" style="margin-top: 1em">'
          if (chkName && !acceptedDirName (chkName)) {optionText += "<br>(ej godkänt albumnamn)";}
          okay = "Fortsätt";
          if (opt === "checked") {okay = "Slutför";}
          cancel = "Avbryt";
        }
        if (opt === "erase") {
          header = "Radera " + nameText; // i18n
          optionText = "<b>Vänligen bekräfta:</b><br>Albumet <b>" + nameText + "<br>ska alltså raderas?</b><br>(<i>kan inte ångras</i>)"; // i18n
          okay = "Ja";
          cancel = "Nej";
        }
        if (opt === "order") {
          header = "Sortera i bildnamnordning"; // i18n
          optionText = "<b>Vänligen bekräfta:</b><br>Bilderna i <b>" + nameText + "<br>ska alltså sorteras i namnordning?</b><br>(<i>kan inte ångras</i>)"; // i18n
          okay = "Ja";
          cancel = "Nej";
        }
        if (opt === "reverse") {
          header = "Sortera i omvänd bildnamnordning"; // i18n
          optionText = "<b>Vänligen bekräfta:</b><br>Bilderna i <b>" + nameText + "<br>ska alltså sorteras i omvänd namnordning?</b><br>(<i>kan inte ångras</i>)"; // i18n
          okay = "Ja";
          cancel = "Nej";
        }
        $ ("#dialog").html (optionText);
        $ ("#dialog").dialog ( { // Initiate a new, confirmation dialog
          title: header,
          closeText: "×",
          autoOpen: false,
          draggable: true,
          modal: true,
          closeOnEscape: true
        });
        var pathNew = $ ("#imdbDir").text () + "/"
        var that = this;
        $ ("#dialog").dialog ('option', 'buttons', [ // Define button array
        {
          text: okay, // Yes
          "id": "yesBut",
          click: function () {

            if (opt === "new") {
              // Check the proposed album name:
              var nameNew = document.querySelector ("input.nameNew").value;
              nameNew = nameNew.replace (/"/g, "?");
              nameNew = nameNew.replace (/ /g, "_");
              while (nameNew.indexOf ("__") > -1) {
                nameNew = nameNew.replace (/__/g, "_");
              }
              if (nameNew === "_") {nameNew = "";}
              if (nameNew.length > 0 && acceptedDirName (nameNew)) {
                $ ("#temporary").text ("checked");
                $ ("#temporary_1").text (nameNew);
                $ (this).dialog ("close");
                later ( ( () => {
                  $ ("#albumEditOption").trigger ("click");
                  later ( ( () => {
                    document.querySelector ("input.nameNew").disabled = true;
                    var tmp = document.querySelector ("input.nameNew").getAttribute ("style");
                    document.querySelector ("input.nameNew").setAttribute ("style", tmp + ";background:#dfd");
                  }), 100);
                }), 100);
              } else {
                console.log ("Improper name: " + nameNew);
                $ ("#temporary_1").text (nameNew);
                $ (this).dialog ("close");
                later ( ( () => {
                  $ ("#albumEditOption").trigger ("click");
                }), 100);
              }

            } else if (opt === "checked") {
              nameNew = $ ("#temporary_1").text (); // Regenerate the picFound album
              var cmd = "mkdir " + pathNew + nameNew + " && touch " + pathNew + nameNew + "/.imdb";
              console.log (cmd);
              mexecute (cmd).then (result => {
                if (result) {
                  var album = $ (that.get ("albumName")).text ();
                  later ( ( () => {
                    infoDia (null, null, album, "<b>Misslyckades: </b>" + pathNew + "<b>" + nameNew + "</b> finns redan<br>" + result, "Ok", true);
                  }), 100);
                } else {
                  console.log ("Album created: " + nameNew);
                  userLog ("CREATED " + nameNew + ", RESTARTING", false, 10000);
                  later ( ( () => {
                    location.reload ();
                  }), 2000);
                }
              });

            } else if (opt === "erase") {
              // Ignore hidden (dotted) files
              cmd = "ls -1 " + $ ("#imdbDir").text ()
              execute (cmd).then (res => {
                res = res.split ("\n");
                var n = 0;
                for (let i=0; i<res.length; i++) {
                  var a = res [i].trim ()
                  if (!(a == '' || a.indexOf ("_imdb_") === 0 || a.indexOf ("_mini_") === 0 || a.indexOf ("_show_") === 0)) {n++;}
                }
                // If n==0, any hidden (dotted) files are deleted along with _imdb_ files etc.
                if (n) {
                  $ (this).dialog ("close");
                  var album = $ (that.get ("albumName")).text ();
                  later ( ( () => {
                    infoDia (null, null, album, " <br><b>Albumet måste tömmas</b><br>för att kunna raderas", "Ok", true);
                  }), 100);
                } else {
                  cmd = "rm -rf " + $ ("#imdbDir").text ();
                  console.log (cmd);
                  execute (cmd).then ( () => {
                    userLog ("DELETED " + nameText + ", RESTARTING");
                    later ( ( () => {
                      location.reload ();
                    }), 2000);
                  });
                }
              });
            } else if (opt === "order" || opt === "reverse") {
              let sortop = "sort -f "; // -f is ignore case
              if (opt === "reverse") sortop = "sort -rf "
              $ ("#saveOrder").trigger ("click");
              later ( ( () => {
                cmd = sortop + $ ("#imdbDir").text () + "/_imdb_order.txt > /tmp/tmp && cp /tmp/tmp " + $ ("#imdbDir").text () + "/_imdb_order.txt";
                execute (cmd).then ( () => {
                  later ( ( () => {
                    $ ("#reLd").trigger ("click");
                  }), 500);
                });
              }), 2000);
            }
            $ (this).dialog ("close");
          }
        },
        {
          text: cancel, // No
          "id": "noBut",
          click: function () {
            if (opt === "new") {
              // do nothing
            } else if (opt === "checked") {
              $ ("#temporary").text ("new");
              $ (this).dialog ("close");
              later ( ( () => {
                $ ("#albumEditOption").trigger ("click");
                later ( ( () => {
                  document.querySelector ("input.nameNew").value = $ ("#temporary_1").text ();
                }), 100);
              }), 100);

            } else if (opt === "erase") {
              console.log ("Untouched: " + nameText);
            } else if (opt === "order" || opt === "reverse") {
              // do nothing
            }
            $ (this).dialog ("close");
          }
        }]);
        niceDialogOpen ();
        $ ("#noBut").focus ();
        $ ("input.nameNew").focus (); // if exists
        if (opt === "checked") {$ ("#yesBut").focus ();}
      }
    },
    //============================================================================================
    // ##### Check file base names against a server directory & modify command(s), NOTE:
    // checkNames uses 1) the server directory in #temporary and 2) the commands in #temporary_1
    checkNames () {
      later ( ( () => {
        var lpath =  $ ('#temporary').text (); // <- the server dir
        getBaseNames (lpath).then (names => {
          //console.log("checkNames:", names);
          var cNames = $ ("#picNames").text ().split ("\n"); // <- the names to be checked
          var cmds = $ ('#temporary_1').text ().split ("\n"); // <- corresp. shell commands
          chkPaths = [];
          for (var i=0; i<cNames.length; i++) {
            if (names.indexOf (cNames [i]) > -1) { // comment out if the file already exists:
              cmds [i] = cmds [i].replace (/^[^ ]+ [^ ]+ /, "#exists already: ");
              userLog ("NOTE exists");
            } else {
              let cmdArr = cmds [i].split (" ");
              if (cmdArr [0] === "mv") {
                chkPaths.push (cmdArr [2]);
                chkPaths.push (cmdArr [cmdArr.length - 1] + cmdArr [2].replace(/^([^/]*\/)*/, ""));
              }
            }
          }
          $ ('#temporary_1').text (cmds.join ("\n"));
        });
      }), 100);
      // Somewhere later, 'sqlUpdate (chkPaths)' will be called, from refresh ()
    },
    //============================================================================================
    hideSpinner () { // ##### The spinner may be clicked away if it renamains for some reason

      $.spinnerWait (false, 100);
      userLog ("STOP spin");
    },
    //============================================================================================
    speedBase () { // ##### Toogle between seconds/textline and seconds/picture

      // Deppink triggers seconds/textline
      var colorText = $ (".nav_links span a.speedBase").css ('color');
      //console.log (colorText);
      if ( colorText !== 'rgb(255, 20, 147)') { // not deeppink but gray or hoover-color
        $ (".nav_links span a.speedBase").css ('color', 'deeppink'); // 'rgb(255, 20, 147)'
      } else {
        $ (".nav_links span a.speedBase").css ('color', 'gray'); // 'rgb(128, 128, 128)'
      }
    },
    //============================================================================================
    selectRoot (value, what) { // ##### Select album root dir (to put into imdbLink) from dropdown
      if (what) {var that = what;} else that = this;
      if(that.get('isLoading')) return;
      that.set('isLoading', true);
      $ (".mainMenu p:gt(1)").hide ();
      //$ (".mainMenu p:gt(1)").show ();
      // Close all dialogs/windows
      $ ("#dialog").dialog ("close");
      $ ("#searcharea").dialog ("close");
      ediTextClosed ();
      $ (".img_show").hide ();
      $ (".nav_links").hide ();
      document.getElementById ("divDropbox").className = "hide-all";
      if (value.indexOf (" ") > -1) value = ""; // The header line contains space
      if (value === "") {
        $ (".mainMenu p:gt(1)").show ();
        return;
      }
      $ ("#rootSel option[value=" + value + "]").prop('selected', 'selected');
      $ ("#imdbRoot").text (value);
      that.set ("imdbRoot", value);
      that.set ("albumData", []); // Triggers jstree rebuild in requestDirs
      $ ("#imdbDirs").text ("");
      $ ("#imdbDir").text ($ ("#imdbLink").text ());
      $ ("#requestDirs").trigger ("click"); // perform ...
      later ( ( () => {
        // Send #imdbRoot and picFound to the server with this GET:
        // (the server needs #picFound base name for old file cleaning)
        return new Promise ( (resolve) => {
          var xhr = new XMLHttpRequest ();
          xhr.open ('GET', 'imdbroot/' + value + "@" + picFound, true, null, null);
          xhr.onload = function () {
            resolve (true);
          };
          xhr.send ();
        }).catch (error => {
          if (error.status !== 404) {
            console.error (error.message);
          } else {
            console.log (error.status, error.statusText, "or NodeJS server error?");
          }
        }).then ( () => {
          var imdbroot = $ ("#imdbRoot").text ();
          if (imdbroot) {
            $ (".mainmenu, .mainMenu p").show ();
            $ (".ember-view.jstree").jstree ("deselect_all");
            $ (".ember-view.jstree").jstree ("close_all");
            $ (".ember-view.jstree").jstree ("open_node", $ ("#j1_1"));
            $ (".ember-view.jstree").jstree ("select_node", $ ("#j1_1")); // calls selectAlbum
            userLog ("START " + imdbroot);
          }
        }).then ( () => {
          startInfoPage ()
        });
      }), 2000); // Time needed!
      later ( ( () => {
        that.set('isLoading', false);
      }), 4000); // Time needed!
    },
    //============================================================================================
    selectAlbum () { // ##### triggered by a click within the JStree
      $.spinnerWait (true, 101);
      let value = $ ("[aria-selected='true'] a.jstree-clicked");
      if (value && value.length > 0) {
        value = $ ("#imdbLink").text () + value.attr ("title").toString ().slice (1); // skip dot
      } else {
        value = "";
      }
      // Do not hide the introduction page at very first view
      if (value !== $ ("#imdbLink").text ()) {
        $ ("iframe.intro").hide ();
      }

      $ ("div.ember-view.jstree").attr ("onclick", "return false");
      $ ("ul.jstree-container-ul.jstree-children").attr ("onclick", "return false");

      new Promise (resolve => {
        $ ("a.jstree-anchor").blur (); // Important?
        let linLen = $ ("#imdbLink").text ().length
        if (value !== $ ("#imdbDir").text ()) {
          // save the index of the preceeding album
          savedAlbumIndex = $ ("#imdbDirs").text ().split ("\n").indexOf ($ ("#imdbDir").text ().slice (linLen));
          $ ("#backImg").text ("");
          $ ("#picName").text ("");
          $ ("#picOrig").text ("");
          $ ("#sortOrder").text ("");
          $ (".showCount").hide ();
        }
        let imdbDir = value;
        $ ("#imdbDir").text (value);
        let selDir = value.slice (linLen);
        let selDirs = $ ("#imdbDirs").text ().split ("\n");
        let selPics = $ ("#imdbLabels").text ().split ("\n");
        let tmp = [""]; // root
        let tmp1 = [""];
        if (selDir) { // not root
          tmp = ["⌂hem", "↖", "⇆"]; // navButtons
          tmp1 = ["", "", ""];
        }
        let i0 = selDirs.indexOf (selDir);
        for (let i=i0; i<selDirs.length; i++) {
          if (selDir === selDirs [i].slice (0, selDir.length)) {
            let cand = selDirs [i].slice (selDir.length);
            if (cand.indexOf ("/") === 0 && cand.replace (/^(\/[^/]+).*$/, "$1") === cand) {
              if (cand.slice (1) !== $ ("#picFound").text ()) {
                //tmp.push (cand.slice (1).replace (/_/g, " "));
                tmp.push (cand.slice (1));
                tmp1.push (selPics [i]);
              }
            }
          }
        }
        if (tmp [0] === "") {
          if (savedAlbumIndex > 0) {
            tmp [0] = "⇆";
          } else {
            tmp = tmp.slice (1); // at root
            tmp1 = tmp1.slice (1); // at root
          }
        }
        var Aobj = EmberObject.extend ({
          album: '',
          image: '',
          name: ''
        }); // NOTE: For the album menu rows in menu-buttons.hbs (a.imDir)
        let a = [];
        for (let i=0; i<tmp.length; i++) {
          a [i] = Aobj.create ({
            album: tmp [i],
            image: tmp1 [i],
            name: tmp [i].replace (/_/g, " ")
          });
        }
        let tmp2 = [""];
        if (value) {tmp2 = value.split ("/");}
        if (tmp2 [tmp2.length - 1] === "") {tmp2 = tmp2.slice (0, -1)} // removes trailing /
        tmp2 = tmp2.slice (1); // remove symbolic link name
        if (typeof this.set === 'function') {
          if (tmp2.length > 0) {
            this.set ("albumName", tmp2 [tmp2.length - 1]);
          } else {
            this.set ("albumName", this.get ("imdbRoot"));
          }
        }
        if (value) {
          $ (".imDir.path").attr ("title-1", albumPath ());
        }
        this.set ("subaList", a); // triggers load of subalbum links into menu-buttons.hbs
        $.spinnerWait (true, 102);
        later ( ( () => {
          $.spinnerWait (true, 103);
          // REFRESH the displayed album
          $ ("#reLd").trigger ("click");
          $ ("div.subAlbum").show ();
          $ ("a.imDir").attr ("title", "Album");
          let n = $ ("a.imDir").length/2; // there is also a page bottom link line...
          let nsub = n;
          let z, iz, obj;
          let fullAlbumName= $ ("#imdbRoot").text () + $ ("#imdbDir").text ().replace (/^[^/]*/, "");
          fullAlbumName = '<span title-1="' + fullAlbumName+ '">' + this.get ("albumName") + ": </span>"
          if (tmp [0] === "⌂hem") {
            $ ("a.imDir").each (function (index, element) {
              if (index < n) {z = 0;} else {z = n;}
              iz = index - z;
              if (iz < 3) { // the first 3 are nav link symbols
                $ (element).attr ("title", returnTitles [iz]);
                $ (element).closest ("div.subAlbum").attr ("title", returnTitles [iz]);
                $ (element).closest ("div.subAlbum").css ("display", navButtons [iz]); // added later
                if (!z) {
                  nsub--;
                  obj = $ (element).closest ("div.subAlbum");
                  obj.addClass ("BUT_1");
                  if (iz === 2) {
                    if ( $ ("#imdbDir").text ().replace (/^[^/]*\//, "").indexOf (picFound) === 0) {
                      obj.after ("<div class=\"BUT_2\"> Tillfälligt album utan underalbum</div><br>"); // i18n
                    } else if (nsub < 1) {
                      obj.after ("<div class=\"BUT_2\"> Har inga underalbum</div><br>"); // i18n
                    } else if (nsub === 1) {
                      obj.after ("<div class=\"BUT_2\"> Har ett underalbum</div><br>"); // i18n
                    } else {
                      obj.after ("<div class=\"BUT_2\"> Har " + nsub + " underalbum</div><br>"); // i18n
                    }
                    obj.after (fullAlbumName);
                  }
                }
              }
            });
          } else if (tmp [0] === "⇆") {
            $ ("a.imDir").each (function (index, element) {
              if (index < n) {z = 0;} else {z = n;}
              iz = index - z;
              if (iz === 0) {
                $ (element).attr ("title", returnTitles [index + 2]);
                $ (element).closest ("div.subAlbum").attr ("title", returnTitles [index + 2]);
                $ (element).closest ("div.subAlbum").css ("display", navButtons [index + 2]); // added later
                if (!z) {
                  nsub--;
                  obj = $ (element).closest ("div.subAlbum");
                  obj.addClass ("BUT_1");
                  if ( $ ("#imdbDir").text ().replace (/^[^/]*\//, "").indexOf (picFound) === 0) {
                    obj.after ("<div class=\"BUT_2\"> Tillfälligt album utan underalbum</div><br>"); // i18n
                  } else if (nsub < 1) {
                    obj.after ("<div class=\"BUT_2\"> Har inga underalbum</div><br>"); // i18n
                  } else if (nsub === 1) {
                    obj.after ("<div class=\"BUT_2\"> Har ett underalbum</div><br>"); // i18n
                  } else {
                    obj.after ("<div class=\"BUT_2\"> Har " + nsub + " underalbum</div><br>"); // i18n
                  }
                  obj.after (fullAlbumName);
                }
              }
            });
          } else {
            obj = $ ("div.subAlbum").first ();
            obj.before (fullAlbumName);
            if ( $ ("#imdbDir").text ().replace (/^[^/]*\//, "").indexOf (picFound) === 0) {
              obj.after ("<div class=\"BUT_2\"> Tillfälligt album utan underalbum</div><br>"); // i18n
            } else if (nsub < 1) {
              obj.before ("<div class=\"BUT_2\"> Har inga underalbum</div><br>"); // i18n
            } else if (nsub === 1) {
              obj.before ("<div class=\"BUT_2\"> Har ett underalbum</div><br>"); // i18n
            } else {
              obj.before ("<div class=\"BUT_2\"> Har " + nsub + " underalbum</div><br>"); // i18n
            }
          }
          // Don't show imdbLink (album root symlink name)
          console.log ("Album " + imdbDir.replace (/^[^/]*/, ".") + ", nsub = " + nsub);

          if (imdbDir_is_picFound ()) $ ("span.centerMark").text (centerMarkSave);
          else $ ("span.centerMark").text ("×"); // reset ´favorites' header´

          resolve (true);
          $.spinnerWait (true, 104);
          later ( ( () => {
            // Don't hide login (at top) if we now have 0/top position!
            // If not, adjust the position, login remains hidden at window top.
            if (0 < window.pageYOffset) {
              scrollTo (null, $ ("#highUp").offset ().top);
            }
          }), 50);
        }), 777);
      }).then ( () => {
        $.spinnerWait (true, 105);
      });
    },
    //============================================================================================
    toggleMainMenu () {

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      $ ("iframe.intro").hide ();
      document.getElementById ("divDropbox").className = "hide-all";
      //var that = this;
      $ ("div.settings, div.settings div.check").hide ();
      if (!$ (".mainMenu").is (":visible")) {
        $ (".mainMenu").show ();
      } else {
        $ (".mainMenu").hide ();
      }
    },
    //============================================================================================
    toggleJstreeAlbumSelect () {

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      if (!$ (".jstreeAlbumSelect").is (":visible")) {
        $ (".jstreeAlbumSelect").show ();
      } else {
        $ (".jstreeAlbumSelect").hide ();
      }
    },
    //============================================================================================
    toggleHideFlagged () { // #####

      if ($ ("#sortOrder").text () === "") return;
      if (!(allow.imgHidden || allow.adminAll)) {
        userLog ("HIDDEN protected");
        return;
      }
      return new Promise ( (resolve) => {
        $ ("#link_show a").css ('opacity', 0);

        if ($ ("#hideFlag").text () === "1") {
          $ ("#hideFlag").text ("0");
          this.actions.hideFlagged (false).then (null); // Show all pics
        } else {
          $ ("#hideFlag").text ("1");
          this.actions.hideFlagged (true).then (null); // Hide the flagged pics
        }
        resolve ("OK");
      }).then (null).catch (error => {
        console.error (error.message);
      });

    },
    //============================================================================================
    hideFlagged (yes) { // #####

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
     return new Promise ( (resolve) => {

      $ ("#link_show a").css ('opacity', 0);
      var tmp = $ ('#sortOrder').text ().trim ();
      if (tmp.length < 1) return;
      var rows = tmp.split ('\n');
      var n = 0, h = 0;
      for (var i=0; i<rows.length; i++) {
        var str = rows [i].trim ();
        var k = str.indexOf (",");
        var name = str.substring (0, k);
        str = str.slice (k+1);
        k = str.indexOf (",");
        var hideFlag = 1*str.substring (0, k); // Used as 1 = hidden, 0 = shown
        str = str.slice (k+1);
        //var albumIndex = 1*str;
        //var dummy = albumIndex; // Not yet used
        var nodelem = document.getElementById ("i" + name);
        if (nodelem) {
          n = n + 1;
          if (hideFlag) {
            nodelem.style.backgroundColor=$ ("#hideColor").text ();
            if (yes) {
              nodelem.style.display='none';
            }
            h = h + 1;
          } else {
            //nodelem.style.backgroundColor='#222';
            nodelem.style.backgroundColor=$ ("#bkgrColor").text ();
            if (yes) {
              nodelem.style.display='block-inline';
            }
          }
        }
      }
      if (yes) {
        $ ('.showCount .numShown').text (" " + (n - h));
        $ ('.showCount .numHidden').text (" " + h);
        $ ('#toggleHide').css ('background-image', 'url(/images/eyes-blue.png)');
      } else {
        $ ('.showCount .numShown').text (" " + n);
        $ ('.showCount .numHidden').text (' 0');
        $ ('#toggleHide').css ('background-image', 'url(/images/eyes-white.png)');
        $ (".img_mini").show (); // Show all pics
      }
      $ ('.showCount .numMarked').text ($ (".markTrue").length + " ");

      var lineCount = parseInt ($ (window).width ()/170); // w150 +> w170 each pic
      $ ('.showCount').hide ();
      $ ('.showCount:first').show (); // Show upper
      $ ("#toggleName").hide ();
      $ ("#toggleHide").hide ();
      if (n > 0) {
        $ ("#toggleName").show ();
        if (allow.adminAll || allow.imgHidden) $ ("#toggleHide").show ();
        $ ("span.ifZero").show ();
        if ( (n - h) > lineCount) {$ ('.showCount').show ();} // Show both
      } else {
        $ ("span.ifZero").hide ();
      }

      resolve ("OK");

     }).catch (error => {
      console.error (error.message);
     });

    },
    //============================================================================================
    showDropbox () { // ##### Display (toggle) the Dropbox file upload area

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      if ($ ("#imdbDir").text () === "") return;
      if ($ (".toggleAuto").text () === "STOP") return; // Auto slide show is running
      $ ("iframe.intro").hide ();
      $ (".mainMenu").hide ();
      $ ("#link_show a").css ('opacity', 0);
      if (document.getElementById ("divDropbox").className === "hide-all") {
        document.getElementById ("divDropbox").className = "show-block";
        $ ("div.settings, div.settings div.check").hide ();
        this.actions.hideShow ();
        $ ("#dzinfo").html ("VÄLJ FOTOGRAFIER FÖR UPPLADDNING"); // i18n
        scrollTo (null, 0);
        if (allow.imgUpload || allow.adminAll) {
          document.getElementById("uploadPics").disabled = false;
        } else {
          document.getElementById("uploadPics").disabled = true;
          userLog ("UPLOAD prohibited");
        }
      } else {
        document.getElementById ("divDropbox").className = "hide-all";
        document.getElementById("reLd").disabled = false;
        document.getElementById("saveOrder").disabled = false;
      }
    },
    //============================================================================================
    showShow (showpic, namepic, origpic) { // ##### Render a 'show image' in its <div>

      document.getElementById ("imageList").className = "hide-all";

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      $ (".mainMenu").hide ();
      $ ("div.settings, div.settings div.check").hide ();
      $ ("ul.context-menu").hide ();
      $ ("#i" + escapeDots (namepic) + " a img").blur ();
      $ ("#picName").text (namepic);
      $ ("#picOrig").text (origpic);
      //$ ("#picOrig").text ($ ("#imdbLink").text () +"/"+ $ ("#i" + escapeDots (namepic) + " a img").attr ("title"));
      resetBorders (); // Reset all borders
      markBorders (namepic); // Mark this one
      $ ("#wrap_show").removeClass ("symlink");
      if ($ ("#i" + escapeDots (namepic)).hasClass ("symlink")) {$ ("#wrap_show").addClass ("symlink");}
       $ ("#full_size").hide (); // button
      if (allow.imgOriginal || allow.adminAll) {$ ("#full_size").show ();}
      $ (".img_show .img_name").text ("");
      $ (".img_show .img_txt1").html ("");
      $ (".img_show .img_txt2").html ("");
      $ (".nav_links").hide ();
      $ ("#link_show a").css ('opacity', 0);
      $ (".img_show img:first").attr ('src', showpic);
      $ (".img_show img:first").attr ("title", origpic.replace (/^[^/]+\//, ""));
      $ (".img_show .img_name").text (namepic); // Should be plain text
      $ (".img_show .img_txt1").html ($ ('#i' + escapeDots (namepic) + ' .img_txt1').html ());
      $ (".img_show .img_txt2").html ($ ('#i' + escapeDots (namepic) + ' .img_txt2').html ());
      // In search result view, show original path for editors:
      if (imdbDir_is_picFound () && (allow.textEdit || allow.adminAll)) {
        execute ("readlink -n " + origpic).then (res => {
          res = res.replace (/^[^/]+\//, "./");
          $ ("#pathOrig").html ("&nbsp;Original: " + res);
        });
      } else {
        $ ("#pathOrig").text ("");
      }
      // The mini image 'id' is the 'trimmed file name' prefixed with 'i'
      if (typeof this.set === 'function') { // false if called from showNext
        var savepos = $ ('#i' + escapeDots (namepic)).offset ();
        if (savepos !== undefined) {
          $ ('#backPos').text (savepos.top); // Vertical position of the mini-image
        }
        $ ('#backImg').text (namepic); // The name of the mini-image
      }
      $ ("#wrap_show").css ('background-color', $ ('#i' + escapeDots (namepic)).css ('background-color'));
      $ (".img_show").show ();
      $ (".nav_links").show ();
      scrollTo (null, $ (".img_show img:first").offset ().top - $ ("#topMargin").text ());
      $ ("#markShow").removeClass ();
      if (document.getElementById ("i" + namepic).firstElementChild.nextElementSibling.className === "markTrue") {
        $ ("#markShow").addClass ("markTrueShow");
      } else {
        $ ("#markShow").addClass ("markFalseShow");
      }
      devSpec (); // Special device settings
      // Prepare texts for ediText dialog if not runAuto
      if ($ ("#navAuto").text () === "false") {
        if ($ ("#textareas").is (":visible")) {
          refreshEditor (namepic, origpic);
        }
        /*if ($ (".img_mini .img_name").css ("display") !== $ (".img_show .img_name").css ("display")) { // Can happen in a few situations
          $ (".img_show .img_name").toggle ();
        }*/
      }
      // Reset draggability for the texts (perhaps set to true somewhere by Jquery?)
      $ ("#wrap_show .img_txt1").attr ("draggable", "false");
      $ ("#wrap_show .img_txt2").attr ("draggable", "false");
      if ($ ("div[aria-describedby='dialog']").is (":visible") && $ ("div[aria-describedby='dialog'] div span").html () === "Information") showFileInfo ();
    },
    //============================================================================================
    hideShow () { // ##### Hide the show image element

      hideShow_g ();
    },
    //============================================================================================
    showNext (forwards) { // ##### SHow the next image if forwards is true, else the previous

      $ (".shortMessage").hide ();
      if (Number ($ (".numShown:first").text ()) < 2) {
        $ ("#navAuto").text ("false");
        $ ("#link_show a").blur ();
        return;
      }
      $ ("#link_show a").css ('opacity', 0);
      var namehere = $ (".img_show .img_name").text ();
      var namepic, minipic, origpic;
      var tmp = document.getElementsByClassName ("img_mini");
      namepic = namehere;
      if (forwards) {
        while (namepic === namehere) {
          namepic = null;
          if (!document.getElementById ("i" + namehere) || !document.getElementById ("i" + namehere).parentElement.nextElementSibling) { // last
            namepic = tmp [0].getAttribute ("id").slice (1);
            userLog ("FIRST", false, 2000);
          } else {
            // here a problem:
            namepic = document.getElementById ("i" + namehere).parentElement.nextElementSibling.firstElementChild.id.slice (1);
          }
          if (document.getElementById ("i" + namepic).style.display === 'none') {
            namehere = namepic;
          }
        }
      } else {
        while (namepic === namehere) {
          namepic = null;
          if (!document.getElementById ("i" + namehere) || !document.getElementById ("i" + namehere).parentElement.previousElementSibling) { // first
            //var tmp = document.getElementsByClassName ("img_mini");
            namepic = tmp [tmp.length - 1].getAttribute ("id").slice (1);
            userLog ("LAST", false, 2000);
          } else {
            namepic = document.getElementById ("i" + namehere).parentElement.previousElementSibling.firstElementChild.id.slice (1);
          }
          if (document.getElementById ("i" + namepic).style.display === 'none') {
            namehere = namepic;
          }
        }
      }

      if (!namepic) return; // Maybe malplacé...
      var toshow = document.getElementById ("i" + namepic);
      minipic = toshow.firstElementChild.firstElementChild.getAttribute ("src");
      origpic = toshow.firstElementChild.firstElementChild.getAttribute ("title");
      origpic = $ ("#imdbLink").text () + "/" + origpic;
      var showpic = minipic.replace ("/_mini_", "/_show_");
      $ (".img_show").hide (); // Hide to get right savepos
      $ (".nav_links").hide ();
      var savepos = $ ('#i' + escapeDots (namepic)).offset ();
      if (savepos !== undefined) {
        $ ('#backPos').text (savepos.top); // Save position
      }
      $ ('#backImg').text (namepic); // Save name
      if (typeof this.set === "function") { // false if called from didInsertElement.
        this.actions.showShow (showpic, namepic, origpic);
      } else {                              // Arrow-key move, from didInsertElement
        this.showShow (showpic, namepic, origpic);
      }
      $ ("#link_show a").blur (); // If the image was clicked
    },
    //============================================================================================
    toggleAuto () { // ##### Start/stop auto slide show

      if (Number ($ (".numShown:first").text ()) < 2) {
        $ ("#navAuto").text ("false");
        return;
      }

      $ ("#dialog").dialog ("close");
      if ($ ("#imdbDir").text () === "") return;
      if ($ ("#navAuto").text () === "false") {
        $ ("#navAuto").text ("true");
        later ( ( () => {
          $ (".nav_links .toggleAuto").text ("STOP");
          $ (".nav_links .toggleAuto").attr ("title", "Avsluta bildbyte [Esc]"); //i18n
          this.runAuto (true);
          document.getElementById("reLd").disabled = true;
          document.getElementById("saveOrder").disabled = true;
        }), 500);
      } else {
        $ ("#navAuto").text ("false");
        later ( ( () => {
          $ (".nav_links .toggleAuto").text ("AUTO");
          $ (".nav_links .toggleAuto").attr ("title", "Automatiskt bildbyte [A]"); //i18n
          this.runAuto (false);
          document.getElementById("reLd").disabled = false;
          document.getElementById("saveOrder").disabled = false;
        }), 500);
      }
    },
    //============================================================================================
    async refresh () { // ##### Reload the imageList and update the sort order

      if ($ ("#imdbDir").text () === "") return;
      if ($ (".toggleAuto").text () === "STOP") return; // Auto slide show is running
      document.getElementById ("imageList").className = "hide-all";
      $ (".miniImgs").hide ();

      $.spinnerWait (true, 106);
      $ ("#link_show a").css ('opacity', 0);
      $ (".img_show").hide ();
      $ (".nav_links").hide ();
      await this.refreshAll ().then (async () => {

        // Do not insert a temporary search result into the sql DB table:
        if (!imdbDir_is_picFound ()) {
          // Perform pending DB updates
          if (chkPaths.length > 0) {
            await sqlUpdate (chkPaths.join ("\n"));
            chkPaths = randIndex (0); // Dummy use of randIndex (=> [])
            chkPaths = [];
          }
        }

        // await this.refreshAll... DOES NOT WAIT!
        // As a compensation, this pause seems reasonable:
        await new Promise (z => setTimeout (z, 6000));

        $.spinnerWait (false, 1002);
        return true;
      });
    },
    //============================================================================================
    saveOrder (spinTrue) { // #####
    // Save, in <imdbDir> on the server, the ordered name list for the thumbnails on the
    // screen. Note that they may, by user's drag-and-drop, have an unknown sort order (etc.)

      if ($ (".toggleAuto").text () === "STOP") return; // Auto slide show is running
      if (!(allow.saveChanges || allow.adminAll) || $ ("#imdbDir").text () === "") return;

      $ ("#link_show a").css ('opacity', 0);
      new Promise (resolve => {
        if (spinTrue) $.spinnerWait (true, 107);
        var i =0, k = 0, SName = [], names, SN;
        SN = $ ('#sortOrder').text ().trim ().split ('\n'); // Take it from the DOM storage
        for (i=0; i<SN.length; i++) {
          SName.push (SN[i].split (",") [0]);
        }
        var UName = $ ('#uploadNames').text ().trim (); // Newly uploaded
        $ ('#uploadNames').text (''); // Reset
        var newOrder = '';
        // Get the true ordered name list from the DOM mini-pictures (thumbnails).
        names = $ (".img_mini .img_name").text ();
        names = names.toString ().trim ().replace (/\s+/g, " ");
        names = names.split (" ");
        for (i=0; i<names.length; i++) {
          k = SName.indexOf (names [i]);
          if (k > -1) {
            if (UName.indexOf (names[i]) > -1) {
              SN [k] = SN [k].replace (/,\d*,/, ',0,'); // Reset the hide flag for newly uploaded
            }
            newOrder = newOrder + '\n' + SN [k];
          } else {
            newOrder = newOrder + '\n' + names [i] + ',0,0';
          }
        }
        newOrder = newOrder.trim ();
        later ( ( () => {
          if (saveOrderFunc) {
            saveOrderFunc (newOrder).then ( () => { // Save on server disk
              document.getElementById ("saveOrder").blur ();
              resetBorders (); // Reset all borders
            });
          }
          if (spinTrue) $.spinnerWait (false, 1003);
        }), 1500);
        resolve (true);
      }).catch (error => {
        console.error (error.message);
      });
    },
    //============================================================================================
    toggleNameView () { // ##### Toggle-view file names

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      $ ("#link_show a").css ('opacity', 0);
      $ (".img_name").toggle ();
      if (document.getElementsByClassName ("img_name") [0].style.display === "none") {
        $ ("#hideNames").text ("1");
      } else {
        $ ("#hideNames").text ("0");
      }
    },
    //============================================================================================
    toggleHelp () { // ##### Toggle-view user manual

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      if ($ ("#helpText").is (":visible") || $ ("#navAuto").text () === "true") {
        $ ('#helpText').dialog ("close");
      } else {
        $ (".mainMenu").hide ();
        let header = "Användarhandledning<br>(främst för dator med mus eller pekplatta och tangentbord)"
        infoDia ("helpText", null, header, $ ("div.helpText").html (), "Stäng", false);
        $ ("#helpText").parent ().css ("top", "0");
      }
    },
    //============================================================================================
    toggleNav () { // ##### Toggle image navigation-click zones

      if ($ ("#navAuto").text () === "true") {
        var title = "Stanna automatisk visning...";
        var text = '<br> ... med <span style="color:deeppink;font-family:monospace;font-weight:bold">STOP</span> eller Esc-tangenten och börja visningen igen med <span style="color:deeppink;font-family:monospace;font-weight:bold">AUTO</span> eller A-tangenten!';
        var yes ="Ok";
        var modal = true;
        infoDia (null, null, title, text, yes, modal);
      } else if ($ ("#link_show a").css ('opacity') === '0' ) {
        $ ("#link_show a").css ('opacity', 1);
      } else {
        $ ("#link_show a").css ('opacity', 0);
      }
      devSpec ();

    },
    //============================================================================================
    toggleBackg () { // ##### Change theme light/dark

      let bgtheme = getCookie ("bgtheme");
      if (bgtheme === "light") {
        BACKG = "#cbcbcb";
      } else {
        BACKG = "#000";
      }
      if ($ ("#imdbRoot").text ()) $ (".mainMenu").hide ();
      if (BACKG === "#000") {
        BACKG = "#cbcbcb";
        TEXTC = "#000";
        BLUET = "#146";
        setCookie ("bgtheme", "light", 0);
      } else {
        BACKG ="#000"; // background
        TEXTC = "#fff"; // text color
        BLUET = "#aef"; // blue text
        setCookie ("bgtheme", "dark", 0);
      }
      $ (".BACKG").css ("background", BACKG); // Repeat in didRender ()!
      $ (".TEXTC").css ("color", TEXTC); // Repeat in didRender ()!
      $ (".BLUET").css ("color", BLUET); // Repeat in didRender ()!
    },
    //============================================================================================
    findText () { // ##### Open dialog to search Xmp metadata text in the current imdbRoot

      let diaSrch = "div[aria-describedby='searcharea']"
      if ($ (diaSrch).css ("display") !== "none") {
        $ ("#searcharea").dialog ("close");
      } else {
        if ($ ("#imdbRoot").text () === "") {
          userLog ("VÄLJ ALBUMKATALOG", true); //i18n
          return;
        }
        $ ("iframe.intro").hide ();
        $ (".mainMenu").hide ();
        ediTextClosed ();
        $ (diaSrch).show ();
        //$ ("#searcharea").dialog ("open");
        niceDialogOpen ("searcharea");
        if (allow.albumEdit || allow.adminAll) $ ("#searcharea div.diaMess div.edWarn").html ("Sökdata...");
        //$ (".ui-dialog").attr ("draggable", "true"); // for jquery-ui-touch-punch, here useless?
        age_imdb_images ();
        let sw = parseInt ( (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth)*0.95);
        let diaSrchLeft = parseInt ( (sw - ediTextSelWidth ())/2) + "px";
        $ (diaSrch).css ("left", diaSrchLeft);
        $ (diaSrch).css ("max-width", sw+"px");
        $ (diaSrch).css ("width", "");
        $ ('textarea[name="searchtext"]').focus ();
        $ ('textarea[name="searchtext"]').select ();
        $ ("button.findText").html ("Sök i <b>" + $ ("#imdbRoot").text () + "</b>");
        $ ("button.findText").show ();
        $ ("button.updText").hide ();
        if (allow.albumEdit || allow.adminAll) {
          $ ("button.updText").show ();
          $ ("button.updText").css ("float", "right");
          $ ("button.updText").html ("Uppdatera söktexter");
          $ ("button.updText").attr ("title", "Förnya sökregistrets bildtexter");
        }
      }
    },
    //============================================================================================
    ediText (namepic) { // ##### Edit picture texts

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      var displ = $ ("div[aria-describedby='textareas']").css ("display");
      var name0 = $ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
      if (allow.textEdit || allow.adminAll) {
        $ ("button.saveTexts").attr ("disabled", false);
        $ (".img_txt1, .img_txt2").css ("cursor","pointer");
      } else {
        $ ("button.saveTexts").attr ("disabled", true);
        $ (".img_txt1, .img_txt2").css ("cursor","text");
        return; // Remove this line if TEXTPREVIEW for anyone is allowed!
      }
      if ($ ("#navAuto").text () === "true") return;
      $ ("#link_show a").css ('opacity', 0);
      $ ('#navKeys').text ('false');
      // In case the name is given, the call originates in a mini-file (thumbnail)
      // Else, the call originates in, or in the opening of, a new|next show-file
      //   that may have an open 'textareas' dialog
      var origpic;
      if (namepic) {
        later ( ( () => {
          displ = $ ("div[aria-describedby='textareas']").css ("display");
          if (displ !== "none" && name0 === namepic) {
            ediTextClosed ();
            return;
          }
        }), 100);
        // NOTE: An ID string for 'getElementById' should have dots unescaped!
        origpic = document.getElementById ("i" + namepic).firstElementChild.firstElementChild.getAttribute ("title"); // With path
        origpic = $ ("#imdbLink").text () + "/" + origpic;

      } else {
        namepic = $ (".img_show .img_name").text ();
        // NOTE: An ID string for JQuery must have its dots escaped! CSS use!
        $ ("#backPos").text ($ ('#i' + escapeDots (namepic)).offset ().top);
        if ($ ("div[aria-describedby='textareas']").css ("display") !== "none") {
          ediTextClosed ();
          return;
        }
        origpic = $ (".img_show img:first").attr ("title"); // With path
        origpic = $ ("#imdbLink").text () + "/" + origpic;
      }
      var sw = ediTextSelWidth (); // Selected dialog width
      var tw = sw - 25; // Text width (updates prepTextEditDialog)
      $ ("#textareas textarea").css ("min-width", tw + "px");
      fileWR (origpic).then (acc => {
        //console.log("> acc:",acc);
        if (acc !== "WR") {
          infoDia (null, null,"Bildtexterna kan inte redigeras", "<br><span class='pink'>" + namepic + "</span> ändringsskyddad, försök igen<br><br>Om felet kvarstår:<br>Kontrollera filen!", "Stäng", true);
          $ ("div[aria-describedby='textareas']").hide ();
          return;
        }
      });
      $ ("#picName").text (namepic);
      displ = $ ("div[aria-describedby='textareas']").css ("display");

      // OPEN THE TEXT EDIT DIALOG and adjust some more details...
      later ( ( () => {
        $ ("#textareas").dialog ("open");
        $ ("div[aria-describedby='textareas']").show ();
        $ ('textarea[name="description"]').attr ("placeholder", "Skriv bildtext: När var vad vilka (för Xmp.dc.description)");
        $ ('textarea[name="creator"]').attr ("placeholder", "Skriv ursprung: Foto upphov källa (för Xmp.dc.creator)");
      }), 50);

      refreshEditor (namepic, origpic); // ...and perhaps warnings

      resetBorders ();
      if (displ === "none") {
        // Prepare the extra "non-trivial" dialog buttons
        $ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.notes").css ("float", "left");
        $ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.notes").attr ("title", "... som inte visas");
        $ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.keys").css ("float", "right");
        $ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.keys").attr ("title", "Extra sökbegrepp");
        // Resize and position the dialog
        var diaDiv = "div[aria-describedby='textareas']"
        sw = parseInt ( (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth)*0.95);
        var diaDivLeft = parseInt ( (sw - ediTextSelWidth ())/2) + "px";
        $ (diaDiv).css ("top", "28px");
        $ (diaDiv).css ("left", diaDivLeft);
        $ (diaDiv).css ("max-width", sw+"px");
        $ (diaDiv).css ("width", "");
        let hs = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var up = 128;
        //var uy = $("div.ui-dialog");
        //var ui = $("div.ui-dialog .ui-dialog-content");
        var uy = $(diaDiv);
        var ui = $(diaDiv + " .ui-dialog-content");
        uy.css ("height", "auto");
        ui.css ("height", "auto");
        uy.css ("max-height", hs + "px");
        ui.css ("max-height", hs - up + "px");
        //uy.css ("top", hs - uy.height () - 13 + "px"); // Lower down...
      }
      $ (".mainMenu").hide ();
      markBorders (namepic);
    },
    //============================================================================================
    fullSize () { // ##### Show full resolution image

      $ ("#link_show a").css ('opacity', 0);
      if (window.screen.width < 500) return;
      if (!(allow.imgOriginal || allow.adminAll)) return;
      var name = $ ("#picName").text ();
      // Only selected user classes may view or download protected images
      if ( (name.startsWith ("Vbm") || name.startsWith ("CPR")) && ["admin", "editall", "edit"].indexOf (loginStatus) < 0) {
        userLog (name + " COPYRIGHT©protected");
        userLog (cmsg, true, 10000); // 10 s
        return;
      }
      $.spinnerWait (true);
      return new Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var origpic = $ (".img_show img:first").attr ("title"); // With path
        origpic = $ ("#imdbLink").text () + "/" + origpic;
        xhr.open ('GET', 'fullsize/' + origpic, true, null, null); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {

            // NOTE: djvuName is the name of a PNG file, starting from 2019, see routes.js
            var djvuName = xhr.responseText;
            //var dejavu = window.open (djvuName  + '?djvuopts&amp;zoom=100', 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no'); // Use the PNG file instead (wrongly named):
            var dejavu = window.open (djvuName, 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no');
            if (dejavu) {dejavu.focus ();} else {
              userLog ("POPUP blocked by browser", true, 5000); // 5 s
            }
            $.spinnerWait (false, 2004);
            resolve (true);
          } else {
            reject ({
              status: this.status,
              statusText: xhr.statusText
            });
          }
        };
        xhr.onerror = function () {
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        };
        xhr.send ();
      }).catch (error => {
        console.error (error.message);
      });
    },
    //============================================================================================
    visitStat () { // ##### Show web visit statistics

      fileWR ("/usr/lib/cgi-bin/awstats.pl").then (acc => {
        if (acc) {
          execute ("/usr/lib/cgi-bin/awstats.pl -config=mish.hopto.org -output > /var/www/mish/public/awstats/index.html").then ( () => {
            var statwind = window.open ('/awstats', 'statwind');
            if (statwind) {statwind.focus ();} else {
              userLog ("POPUP blocked by browser", true, 5000);
            }
          });
        } else {
          //console.log ("NO AWSTATS");
          var title = "Information";
          var text = "<br>Här saknas<br>besöksstatistik"; // i18n
          var yes = "Ok" // i18n
          infoDia (null, null, title, text, yes, true);
        }
      });

    },
    //============================================================================================
    downLoad () { // ##### Download an image

      if (!(allow.imgOriginal || allow.adminAll)) return;
      let name = $ ("#picName").text ();
      // Only selected user classes may view or download protected images
      if ( (name.startsWith ("Vbm") || name.startsWith ("CPR")) && ["admin", "editall", "edit"].indexOf (loginStatus) < 0) {
        userLog ("COPYRIGHT©protected", true);
        later ( ( () => {
          userLog (cmsg, true, 10000); // 10 s
        }), 2000);
        return;
      }
      $ ("#link_show a").css ('opacity', 0);
      $.spinnerWait (true);
      return new Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var tmp = $ ("#picName").text ().trim ();
        later ( ( () => {
          resetBorders (); // Reset all borders
          markBorders (tmp); // Mark this one
        }), 50);
        var edt = escapeDots (tmp);
        var origpic = $ ('#i' + edt + ' img.left-click').attr ("title"); // With path
        origpic = $ ("#imdbLink").text () + "/" + origpic;
        // If origpic is a symlink then resolve the target: important for a #picFound
        // at least, must not be downloaded with a temporary name suffix
        if ($ ("#i" + edt).hasClass ("symlink")) {
          execute ("readlink -n " + origpic).then (res => {
            origpic = res.replace (/^(\.{1,2}\/)*/, $ ("#imdbLink").text () + "/");
          });
        }
        later ( ( () => {
          xhr.open ('GET', 'download/' + origpic, true, null, null); // URL matches routes.js with *?
          xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
              //console.log (this.responseURL); // Contains http://<host>/download/...
              var host = this.responseURL.replace (/download.+$/, "");
              $ ("#download").attr ("href", host + this.responseText); // Is just 'origpic'(!), outdated?
              later ( ( () => {
                //$ ("#download").trigger ("click"); //DOES NOT WORK
                document.getElementById ("download").trigger ("click"); // Works
                $.spinnerWait (false, 2005);
                userLog ("DOWNLOAD");
                resolve (true);
              }), 400);
            } else {
              reject ({
                status: this.status,
                statusText: xhr.statusText
              });
            }
          };
          xhr.onerror = function () {
            reject ({
              status: this.status,
              statusText: xhr.statusText
            });
          };
          xhr.send ();
        }), 200); // In order to get time if readlink was executed
      }).catch (error => {
        console.error (error.message);
      });
    },
    //============================================================================================
    toggleMark (name) { // ##### Mark an image

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      if (!name) {
        name = document.getElementById ("link_show").nextElementSibling.nextElementSibling.textContent.trim ();
      }
      $ ("#picName").text (name);
      resetBorders (); // Reset all borders
      var ident = "#i" + escapeDots (name) + " div:first";
      var marked = $ (ident).hasClass ("markTrue");
      $ (ident).removeClass ();
      $ ("#markShow").removeClass ();
      if (marked) {
        $ (ident).addClass ('markFalse');
        $ ("#markShow").addClass ('markFalseShow');
      } else {
        $ (ident).addClass ('markTrue');
        $ ("#markShow").addClass ('markTrueShow');
      }
      $ ('.showCount .numMarked').text ($ (".markTrue").length + " ");
    },
    //============================================================================================
    logIn () { // ##### User login/confirm/logout button pressed

      var usr = "", status = "";
      $ ("#title span.eraseCheck").css ("display", "none");
      $ ("div[aria-describedby='textareas']").css ("display", "none");
      $ ("#searcharea").dialog ("close");
      document.getElementById ("divDropbox").className = "hide-all";
      ediTextClosed ();
      var that = this;
      $ (".img_show").hide ();
      $ (".nav_links").hide ();
      var btnTxt = $ ("#title button.cred").text ();
      $ ("#title span.cred.status").show ();

      //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
      if (btnTxt === "Logga in") { // Log in (should be buttonText[0] ... i18n)
        $ ("#title input.cred").show ();
        $ ("#title button.cred").text ("Bekräfta");
        $ ("#title button.cred").attr ("title", "Bekräfta inloggning");
        later ( ( () => {
          $ ("#title input.cred").blur ();
          $ ("#title a.proid").focus (); // Prevents FF showing link to saved passwords
        }),100);
        return;
      }
      //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
      if (btnTxt === "Logga ut") { // Log out
        $ ("#hideFlag").text ("1");// Two lines from 'toggleHideFlagged'
        this.actions.hideFlagged (true).then (null); // Hide flagged pics if shown
        $ ("#title button.cred").text ("Logga in");
        $ ("#title button.cred").attr ("title", logAdv);
        $ ("#title button.cred").attr ("totip", logAdv);
        $ ("#title span.cred.name").text ("");
        $ ("#title span.cred.status").text ("");
        $ ("#title span.cred.status").hide ();
        loggedIn = false;
        $ ("div.settings, div.settings div.check").hide ();
        userLog ("LOGOUT");
        $ ("#title a.proid").focus ();
        zeroSet (); // #allowValue = '000... etc.
        this.actions.setAllow ();
        $ (".mainMenu p:eq(3) a").hide (); // Hide the album-edit button in mainMenu
        $ ("#showDropbox").hide ();  // Hide upload button
        $ ("#viSt").hide (); // Hide visit statistics button
        $ ("#netMeeting").hide (); // Hide meeting button

        if ($ ("#imdbRoot").text ()) { // If imdb is initiated
          // Regenerate the picFound album: the shell commands must execute in sequence
          let lpath = $ ("#imdbLink").text () + "/" + $ ("#picFound").text ();
          execute ("rm -rf " +lpath+ "&&mkdir -m0775 " +lpath+ "&&touch " +lpath+ "/.imdb&&chmod 664 " +lpath+ "/.imdb").then ();
        }
        // Inform about login/logout i18n
        let text = "Du kan fortsätta att se på bilder utan att logga in, ";
        text += "men med <b style='font-family:monospace'>gästinloggning</b>* kan du:<br><br>";
        text += '<div style="text-align:left">'
        text += "1. Tillfälligt gömma vissa bilder (bra att ha om du vill visa en ";
        text += "bildserie men hoppa över en del)<br>";
        text += "2. Byta ordningsföljden mellan bilderna (dra/släpp; bra att ha ";
        text += "om du vill visa en viss följd av bilder)<br>";
        text += "3. Se bilder i större förstoring (förbehåll för vissa bilder där ";
        text += "vi inte har tillstånd av copyright-innehavaren)<br><br>";

        text += "Logga in som *<b style='font-family:monospace'>gäst</b> genom att ";
        text += "(1) klicka på <b style='font-family:monospace'>Logga in</b>, (2) skriva <b style='font-family:monospace'>gäst</b> (eller <b style='font-family:monospace'>guest</b>) i <b style='font-family:monospace'>User name</b>-fältet ";
        text += "(ta bort om där står något annat) och (3) klicka på <b style='font-family:monospace'>Bekräfta</b> (inget Password!). ";
        text += "Du är nu användaren <b style='font-family:monospace'>gäst</b> med <b style='font-family:monospace'>guest</b>-rättigheter – andra användare ";
        text += "måste logga in med lösenord (password) och kan ha andra rättigheter ";
        text += "utöver 1. 2. 3. ovan.<br><br>";
        text += "</div>"

        text += "Om du misslyckas med inloggningen (alltså gör fel, visas ej här!) blir ";
        text += "du inloggad som <b style='font-family:monospace'>anonym</b> som är likvärdigt med att vara utloggad. ";
        text += "Börja om med att logga ut och så vidare.";
        $ ("iframe.intro").hide ();
        $ (".mainMenu").hide ();
        if (notLoggedOutEver) infoDia ("", "", '<b style="background:transparent">ÄR DU UTLOGGAD?</b>', text, "Jag förstår!", false, false);
        notLoggedOutEver = false;
        later ( ( () => { // Do not hide the top logon line:
          $ ("#dialog").parent ().css ("top", "4em");
        }), 200);
        document.getElementById ("t3").parentElement.style.display = "none";

        // Assure that the album tree is properly shown after LOGOUT
        this.set ("albumData", []); // Triggers jstree rebuild in requestDirs
        setTimeout (function () { // *NOTE: Normally, later replaces setTimeout
          $ ("#requestDirs").trigger ("click");
          later ( ( () => {
            $ (".ember-view.jstree").jstree ("deselect_all");
            $ (".ember-view.jstree").jstree ("close_all");
            $ (".ember-view.jstree").jstree ("open_node", "#j1_1");
            $ (".ember-view.jstree").jstree ("select_node", "#j1_1"); // calls selectAlbum
          }), 2000);
        }, 2000);                 // *NOTE: Preserved here just as an example
        $.spinnerWait (false, 4006);
        return;
      }
      //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
      if (btnTxt === "Bekräfta") { // Confirm
        usr = $ ("#title input.cred.user").val ();
        var pwd = $ ("#title input.cred.password").val ().trim (); // Important
        $ ("#title input.cred.password").val ("");
        $ ("#title input.cred").hide ();
        this.set ("albumData", []); // Triggers jstree rebuild in requestDirs
        loggedIn = false;
        zeroSet (); // #allowValue = '000... etc.
        this.actions.setAllow ();
        var albFind;
        var picFind;
        loginError ().then (isLoginError => {
          if (isLoginError) {
            // Update aug 2017: will never happen!
            $ ("#title button.cred").text ("Logga in");
            $ ("#title button.cred").attr ("title", logAdv);
            $ ("#title button.cred").attr ("totip", logAdv);
            loggedIn = false;
            $ ("div.settings, div.settings div.check").hide ();
            userLog ("LOGIN error");
            this.actions.setAllow ();
          } else {
            if (usr !== "anonym") {$ ("#dialog").dialog ("close");}
            $ ("#title button.cred").text ("Logga ut");
            //$ ("#title button.cred").attr ("title", "Du är inloggad ..."); // more below
            loggedIn = true;
            //this.set ("loggedIn", true);
            status = $ ("#title span.cred.status").text (); // [<status>]
            userLog ("LOGIN " + usr + " " + status);
            status = status.slice(1,status.length-1); // <status>
            this.actions.setAllow ();

            // NOTE: The server sets an albFind|picFind short time cookie when trig-
            // gered from the browser by .../album/<albumdir>/[<album>[/<picname>]]
            // (<album> is found in the present album root directory <albumdir>)
            // or .../find/<albumdir>[/<picname(s)>]. Sets IMDB_ROOT = <albumdir>.
            var albFindCoo = getCookie ("album");
            var picFindCoo = getCookie ("find");
            let tmpRoot = $ ("#imdbRoot").text ();
            if (albFindCoo) tmpRoot = albFindCoo.split ("/") [0];
            if (picFindCoo) tmpRoot = picFindCoo.split ("/") [0];
            $ ("#imdbRoot").text (tmpRoot);
            this.set ("imdbRoot", tmpRoot);
            if (tmpRoot) {
              this.actions.selectRoot (tmpRoot, this);
              this.set ("albumData", []); // Triggers jstree rebuild in requestDirs
              $ ("#requestDirs").trigger ("click");
              // Regenerate the picFound album: the shell commands must execute in sequence
              let lpath = $ ("#imdbLink").text () + "/" + $ ("#picFound").text ();
              //execute ("rm -rf " +lpath+ " && mkdir -m0775 " +lpath+ " && touch " +lpath+ "/.imdb").then ();
              execute ("rm -rf " +lpath+ "&&mkdir -m0775 " +lpath+ "&&touch " +lpath+ "/.imdb&&chmod 664 " +lpath+ "/.imdb").then ();
              // Remove all too old picFound album catalogs:
              let lnk = this.get ("imdbLink"); // NOTE: Remember the added random <.01yz>
              let toold = 60; // minutes. NOTE: Also defined in routes.js, please MAKE COMMON!!
              execute ('find -L ' + lnk + ' -type d -name "' + picFound + '*" -amin +' + toold + ' | xargs rm -rf').then ();
              userLog ("START " + $ ("#imdbRoot").text ());
              later ( ( () => {

                // The getCookie result is used here, detects external "/album/..."
                // and external "/find/...", but NOTE: Only one of them, never both
                if (albFindCoo) albFind = albFindCoo.split ("/");
                else albFind = ["", "", ""];
                if ($ ("#imdbRoots").text ().split ("\n").indexOf (albFind [0]) < 1) albFind = ["", "", ""];
                if (picFindCoo) picFind = picFindCoo.split ("/");
                else picFind = ["", ""];
                if ($ ("#imdbRoots").text ().split ("\n").indexOf (picFind [0]) < 1) picFind = ["", ""];
                later ( ( () => {
                  $ (".ember-view.jstree").jstree ("deselect_all");
                  $ (".ember-view.jstree").jstree ("close_all");
                  $ (".ember-view.jstree").jstree ("open_node", "#j1_1");
                  $ (".ember-view.jstree").jstree ("select_node", "#j1_1"); // calls selectAlbum
                  startInfoPage ()
                }), 1000);
              }), 500);
              // Next lines are a 'BUG SAVER'. Else, is all not initiated...?
              // And the delay appears to be important, 2000 is too little.
              later ( ( () => {
                $ ("#j1_1_anchor").trigger ("click");
              }), 6000);
            }
            $ ("#title a.proid").focus ();
          }
        });
        $ (document).tooltip ("enable");

        later ( () => {
          //console.log (usr, "status is", status);
          // At this point, we are always logged in with at least 'viewer' status
          if (!(allow.notesView || allow.adminAll)) {
            document.getElementById ("t3").parentElement.style.display = "none";
          } else {
            document.getElementById ("t3").parentElement.style.display = "";
          }
          // Hide or show the album-edit button in mainMenu
          if (!(allow.albumEdit || allow.adminAll)) $ (".mainMenu p:eq(3) a").hide ()
          else $ (".mainMenu p:eq(3) a").show ();

          // Check albumfind and picturefind cookies, they support navigation
          // by web address, in a "very preliminary & primitive way"
          later ( () => {
            if (albFind) {
              if (albFind [0] && status !== "viewer") {
                later ( () => {
                  console.log ("/album/:", albFind [0], albFind [1]);
                  later ( () => {
                    $ ("#imdbDir").text ("");
                    subaSelect (albFind [1]);
                  }, 4000);
                  later ( () => {
                    if (albFind [2]) {
                      later ( () => {
                        let idimg = "#i" + escapeDots (albFind [2]);
                        $ (idimg + " img") [0].trigger ("click");
                      }, 8000);
                    } // end if
                  }, 4000);
                }, 2000);
              } // end if
            } // end if
            if (picFind) {
              if (picFind [0] && status !== "viewer") {
                later ( () => {
                  console.log ("/find/:", picFind [0], picFind [1]);
                  this.actions.findText ();
                  if (picFind [1]) {
                    document.querySelector ('.orAnd input[type="radio"]').checked = false;
                    document.querySelectorAll ('.orAnd input[type="radio"]') [1].checked = true;
                    $ ("#searcharea textarea").val (picFind [1]);
                    later ( () => {
                      $ ("button.findText").trigger ("click");
                      later ( () => {
                        parentAlbum ();
                        later ( () => {
                          let idimg = "#i" + escapeDots (picFind [1]);
                          $ (idimg + " img") [0].trigger ("click");
                        }, 8000);
                      }, 6000);
                    }, 4000);
                  } // end if
                }, 2000);
              } // end if
            } // end if

            // Hide or show the web traffic statistics button
            if (allow.deleteImg || allow.adminAll) $ ("#viSt").show ()
            else $ ("#viSt").hide ();
            // Hide or show the net meeting button
            if (loggedIn) $ ("#netMeeting").show ()
            else $ ("#netMeeting").hide ();

          }, 2000);
          $.spinnerWait (false, 2007);
        }, 2000);
      } // end Confirm
      //¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤¤
      // When password doesn't match user, return true; [else set 'allowvalue' and return false]
      // NOTE: Update aug 2017: else set anonymous viewer with no credentials, still return true
      function loginError () {
        return new Promise (resolve => {
          getCredentials (usr).then (credentials => {
            var cred = credentials.split ("\n");
            var password = cred [0];
            status = cred [1];
            var allval = cred [2];
            if (pwd !== password) {
              zeroSet (); // Important!
              allval = $ ("#allowValue").text ();
              status = "viewer";
            }
            loginStatus = status; // global
            if (status === "viewer") {usr = "anonym";}  // i18n
            //$.spinnerWait (true);
            $ ("#allowValue").text (allval);
            $ ("#title span.cred.name").html ("<b>"+ usr +"</b>");
            $ ("#title span.cred.status").html ("["+ status +"]");
            let tmp = "Du är inloggad som ’" + usr + "’ med [" + status + "]-rättigheter"; // i18n
            let tmp1 = " (För medverkande: Logga ut före ny inloggning)";
            $ ("#title button.cred").attr ("title", tmp + tmp1);
            $ (".cred.name").attr ("title", tmp);
            $ (".cred.status").attr ("title", "Se dina rättigheter");
            $ ("#title button.cred").attr ("totip", tmp + tmp1);
            $ (".cred.name").attr ("totip", tmp);
            $ (".cred.status").attr ("totip", "Se dina rättigheter");
            // Assure that the album tree is properly shown
            that.set ("albumData", []); // Triggers jstree rebuild in requestDirs
            that.actions.setAllow ();
            later ( ( () => {
              $ ("#requestDirs").trigger ("click");
              setTimeout (function () { // NOTE: Normally, later replaces setTimeout
                $ (".ember-view.jstree").jstree ("deselect_all");
                $ (".ember-view.jstree").jstree ("close_all");
                $ (".ember-view.jstree").jstree ("open_node", $ ("#j1_1"));
                later ( ( () => {
                  $ (".ember-view.jstree").jstree ("select_node", $ ("#j1_1")); // calls selectAlbum
                  // Show the unchecked erase-link&&source checkbox if relevant
                  eraseOriginals = false;
                  if ( (allow.deleteImg || allow.adminAll) && ["admin", "editall"].indexOf (loginStatus) > -1) {
                    $ ("#title span.eraseCheck").css ("display", "inline");
                    $ ("#eraOrig") [0].checked = false;
                  } else {
                    $ ("#title span.eraseCheck").css ("display", "none");
                    $ ("#eraOrig") [0].checked = false;
                  }
                }), 2000);
                resolve (false);
              }, 2000);                 // NOTE: Preserved here just as an example
            }), 200);

            // Hide upload button if just viewer or guest:
            if (status === "viewer" || status === "guest") {
              $ ("#showDropbox").hide ();
            } else {
              $ ("#showDropbox").show ();
            }
          }).catch (error => {
            console.error (error.message);
          });

          function getCredentials (user) { // Sets .. and returns ...
            return new Promise ( (resolve, reject) => {
              // ===== XMLHttpRequest checking 'usr'
              var xhr = new XMLHttpRequest ();
              xhr.open ('GET', 'login/' + user, true, null, null);
              xhr.onload = function () {
                resolve (xhr.responseText);
              }
              xhr.onerror = function () {
                reject ({
                  status: that.status,
                  statusText: xhr.statusText
                });
              }
              xhr.send ();
            }).catch (error => {
              console.error (error.message);
            });
          }
        });
      }
    },
    //============================================================================================
    toggleSettings () { // ##### Show/change settings

      $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
      if (!loggedIn || $ ("div.settings").is (":visible")) {
        $ ("div.settings, div.settings div.check").hide ();
        return;
      }
      $ ("div.settings, div.settings div.check").show ();
      $ ("#dialog").dialog ("close");
      $ ("#searcharea").dialog ("close");
      ediTextClosed ();
      document.getElementById ("divDropbox").className = "hide-all";
      $ (".img_show").hide (); // settings + img_show don't go together
      $ (".nav_links").hide ();
      this.actions.setAllow (); // Resets unconfirmed changes
      document.querySelector ('div.settings button.confirm').disabled = true;
      var n = document.querySelectorAll ('input[name="setAllow"]').length;
      for (var i=0; i<n; i++) {
        document.querySelectorAll ('input[name="setAllow"]') [i].disabled = false;
        document.querySelectorAll ('input[name="setAllow"]') [i].addEventListener ('change', function () {
          document.querySelector ('div.settings button.confirm').disabled = false;
        })
      }
      // Protect the first checkbox (must be 'allow.adminAll'), set in the sqLite tables:
      document.querySelectorAll ('input[name="setAllow"]') [0].disabled = true;
      // Lock if change of setting is not allowed
      if (!(allow.setSetting || allow.adminAll)) {
        disableSettings ();
        $ (".settings input[type=checkbox]+label").css ("cursor", "default");
      }
      if ($ ("div.settings").is (":visible")) {
        $ (".mainMenu").hide ();
      }
    },
    //============================================================================================
    webLinker () {
      if ($ ("div[aria-describedby='dialog']").is (":visible")) {
        $ ("#dialog").dialog ("close");
        return;
      }
      $ ("iframe.intro").hide ();
      let linktext = window.location.hostname
      if (linktext === "localhost") {
        linktext = "http://localhost:3000";
      } else {
        linktext = "https://" + linktext;
      }
      linktext += "/find/" + $ ("#imdbRoot").text () + "/";
      let pixt = "bilden"; // i18n
      let name = $ ("#picName").text (); // Link to a single picture
      if ($ ("#imdbDir").text () === $ ("#imdbLink").text () + "/" + $ ("#picFound").text ()) {
        name = name.replace (/\.[^.]{4}$/, "");
      }
      linktext += name;
      let lite = "<br>Välj först en albumbild!";
      if (linktext.replace (/^([^/]*\/)*(.*)/, "$2")) {
        lite = "Webblänk till " + pixt + ":<br><br>";
        lite += '<div style="text-align:left;word-break:break-all">';
        lite += '<a href="' + linktext + '" target="_blank" draggable="false">';
        lite += '<b style="font-size:90%">' + linktext + "</b></a><br><br>";
        lite += '</div><div style="text-align:left">';
        lite += "Kopiera länktexten – den kan användas som ”klicklänk” i mejl "
        lite += "eller i en webbläsares adressfält ";
        lite += "(du kan testa med att klicka på länken)<br><br>";
        lite += "Kontrollera resultatet innan du skickar länken vidare till någon annan; ";
        lite += "om det inte blir som man tänkt sig kan det ";
        lite += "orsakas av namnlikhet, dolt album eller annat</div>";
        if (loginStatus !== "guest") {
          lite += "<br>Tänk på att vissa bilder kan kräva mer än gästinloggning för att kunna ";
          lite += "ses. Var därför gärna inloggad som ”gäst” när du gör en webblänk till andra!";
        }
      }
      infoDia (null, null, "Länk för webbläsare", lite, "OK – stäng");
    },
    //============================================================================================
    seeFavorites () {
      if ($ ("textarea.favorites").is (":visible")) {
        $ ("#dialog").dialog ("close");
        $ (".mainMenu").hide ();
        return;
      }
      $ ("iframe.intro").hide ();
      let favList = getCookie ("favorites").replace (/[ ]+/g, "\n");
      favDia (favList, "Hämta fil", "Lägg till markerade", "Spara", "Stäng", "Spara fil", "Finn och visa", "Töm listan");
      $ (".mainMenu").hide ();
    },
    //============================================================================================
    goTop () {
      scrollTo (0, 0);
      $ (".mainMenu").hide ();
      $ ("#dialog").dialog ("close");
    },
    //============================================================================================
    parAlb (name) { // #### Go to a (in DOM) linked picture's original (source) album
      let tmp = escapeDots (name);
      let   tgt = $ ("#i" + tmp + " img");
      parentAlbum (tgt);
    },
    //============================================================================================
    subalbumSelect (subal) {
      subaSelect (subal);
    }
  }
});
// G L O B A L S, that is, 'outside' (global) variables and functions (globals)
   //////////////////////////////////////////////////////////////////////////////////////
var BLINK; // setInterval return handle
var BLINK_TAG; // DOM reference for the function blink_text
// Set BLINK_TAG and start with: BLINK = setInterval (blink_text, 600);
// Cancel with clearInterval (BLINK);
var blink_text = function () {
  $(BLINK_TAG).fadeOut(350);
  $(BLINK_TAG).fadeIn(150);
}
let BACKG = "#cbcbcb";
let TEXTC = "#000";
let BLUET = "#146";
let bkgTip = "Byt bakgrund";
let centerMarkSave = "×";
let cmsg = "Får inte laddas ned/förstoras utan särskilt medgivande: Vänligen kontakta copyrightinnehavaren eller Hembygdsföreningen"
let eraseOriginals = false;
let homeTip = "I N T R O D U K T I O N";
let logAdv = "Logga in för att kunna se inställningar: Anonymt utan namn och lösenord, eller med namnet ’gäst’ utan lösenord som ger vissa redigeringsrättigheter"; // i18n
let loggedIn = false;
let mailAdmin = "tore.ericsson@tores.se"
let nosObs = "Du får skriva men kan ej spara text utan annan inloggning"; // i18n
let notLoggedOutEver = true;
let nopsGif = "GIF-fil kan bara ha tillfällig text"; // i18n
let picFound = "Funna_bilder"; // i18n
let preloadShowImg = [];
let loginStatus = "";
let tempStore = "";
let chkPaths = []; // For DB picture paths to be soon updated (or removed)
let savedAlbumIndex = 0;

// NOTE: returnTitles [2] is used as a ´word´ in some places (must be one item), search for it!
let returnTitles = ["HEM till ROT-albumet", "MOT ROT-albumet", "TILL-SENASTE-album"]; // i18n
// Corresponding navigation buttons display=""|"none" in the high position, the extra are low down
let navButtons = ["", "none", "none"]; // Additional extra navigation buttons ["⌂hem", "↖", "⇆"]
//  The "⇆" button is triggered/pressed by the browser's navigation arrows, visibility-independent
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Cookie functions
function setCookie(cname, cvalue, exminutes) {
  if (exminutes) {
    var d = new Date();
    d.setTime(d.getTime() + (exminutes*60000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Lax";
  } else {
    document.cookie = cname + "=" + cvalue + ";path=/;SameSite=Lax";
  }
  }
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Make an array where the numbers 0, 1,... (N-1) are ordered randomly
function randIndex (N) { // improve, se w3c example
  var a = [];
  Array.from (Array(N), (e, i) => {
    a [i] = {index: i, value: Math.random()};
  });
  a = a.sort ((a,b)=>{return a.value - b.value});
  Array.from (Array (N), (e, i) => {a [i] = a [i].index})
  return a;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ Execution pause (wait milliseconds)
function pause (ms) { // or use 'await new Promise (z => setTimeout (z, 2000))'
  console.log('pause',ms)
  return new Promise (done => setTimeout (done, ms))
}*/
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// TRUE if the current album is the search result album, with random postfix
// This album has less write restrictions etc.
let imdbDir_is_picFound = () => $ ("#imdbDir").text ().replace (/^[^/]*\//, "") === $ ("#picFound").text ();
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Get the "true" album path (imdbx is the symbolic link to the actual root of albums)
function albumPath () {
  let imdbx = new RegExp($ ("#imdbLink").text ());
  return $ ("#imdbDir").text ().replace (imdbx, $ ("#imdbRoot").text ());
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Check if an album/directory name can be accepted (a copy from the server)
function acceptedDirName (name) { // Note that &ndash; is accepted:
  let acceptedName = 0 === name.replace (/[/\-–@_.a-öA-Ö0-9]+/g, "").length && name !== $ ("#imdbLink").text ();
  return acceptedName && name.slice (0,1) !== "." && !name.includes ("/.") && !name.includes (picFound);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Get the age of _imdb_images databases
function age_imdb_images () {
  if (allow.albumEdit || allow.adminAll) {
    let imdbx = $ ("#imdbLink").text ();
    execute ('echo $(($(date "+%s")-$(date -r ' + imdbx + '/_imdb_images.sqlite "+%s")))').then (s => {
      let d = 0, h = 0, m = 0, text = "&nbsp;";
      if (s*1) {
        d = (s - s%86400);
        s = s - d;
        d = d/86400;
        h = (s - s%3600);
        s = s - h;
        h = h/3600;
        m = (s - s%60);
        s = s - m;
        m = m/60;
        // Show approximate txt database age
        text = "Söktextålder: ";
        if (d) {text += d + " d "; s = 0; m = 0;}
        if (h) {text += h + " h "; s = 0;}
        if (m) {text += m + " m ";}
        if (s) {text += s + " s ";}
      }
      $ ("#searcharea div.diaMess div.edWarn").html (text);
    })
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Load all image paths of the current imdbRoot tree into _imdb_images.sqlite
function load_imdb_images () {
  return new Promise (resolve => {
    $.spinnerWait (true);
    userLog ("Det här kan ta några minuter ...", true, 5000)
    let cmd = '$( pwd )/ld_imdb.js -e';
    execute (cmd).then ( () => {
      $.spinnerWait (false, 5008);
      userLog ("Image search texts updated");
      $ ("div[aria-describedby='searcharea']").show ();
      $ ("button.updText").css ("float", "right");
      $ ("button.updText").hide ();
      resolve ("Done")
    });
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Hide the show image element, called by hideShow ()
function hideShow_g () {

  document.getElementById ("imageList").className = "show-block";

  $ ("ul.context-menu").hide (); // if open
  $ ("#link_show a").css ('opacity', 0);
  $ (".img_show div").blur ();
  if ($ (".img_show").is (":visible")) {
    $ (".img_show").hide ();
    $ (".nav_links").hide ();
    gotoMinipic ($ (".img_show .img_name").text ());
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Waiting spinner wheel for server activities etc.
$.spinnerWait = function (runWait, delay) {
//function $.spinnerWait (runWait, delay) {
  // Delay is used only at end of waiting
  if (!delay) delay = 0;
  $ ("div.ui-tooltip-content").remove (); // May remain unintentionally ...
  if (runWait) {
    //console.log(" Startspin",delay); // Here only used as debug id-number
    $ (".spinner").show ();
    clearInterval (BLINK); // Unlock if occasionaly in use ...
    BLINK_TAG = "#menuButton";
    BLINK = setInterval (blink_text, 600);
    $ (".mainMenu").hide ();
    $ ("div.settings, div.settings div.check").hide ();
    //document.getElementById("menuButton").disabled = true;
    document.getElementById("reLd").disabled = false; // Important! Must be always available
    document.getElementById("saveOrder").disabled = true;
    document.getElementById ("divDropbox").className = "hide-all";
  } else { // End waiting
    later ( ( () => {
    //console.log("Stopspin",delay);
      $ (".spinner").hide ();
      clearInterval (BLINK);
    }), delay);
    later ( ( () => {
      document.getElementById("menuButton").disabled = false;
      document.getElementById("reLd").disabled = false;
      document.getElementById("saveOrder").disabled = false;
      document.getElementById("showDropbox").disabled = false; // May be disabled at upload!
      document.getElementById ("imageList").className = "show-block"; // Important! But...
      $ ("#title a.proid").focus ();
    }), 100);
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function startInfoPage () { // Compose the information display page
  let iWindow = document.querySelector("iframe.intro").contentWindow;
  let iImages = iWindow.document.getElementsByTagName ("img");
  let nIm = iImages.length;
  var linktext = window.location.hostname
  if (linktext === "localhost") {
    linktext = "http://localhost:3000" + "/";
  } else {
    linktext = "https://" + linktext + "/";
  }
  execute ("cat " + $ ("#imdbLink").text () + "/_imdb_intro.txt | egrep '^/'").then (result => {
    $ ("#imdbIntro").text (result);
    var intro = result.split ("\n");
    if (intro.length < 2 || intro [0].indexOf ("Command failed") === 0) {
      $ ("#imdbIntro").text ("");
      intro = [];
      console.log("Inga introbilder");
    } else {
      console.log("Introbilder: " + intro.length);
    }
    return intro;
  }).then (intro => {
    let iText = iWindow.document.querySelectorAll ("span.imtx");
    // Remove all images except the first
    for (let i=1; i<nIm; i++) {
      iImages [i].style.width = "0";
      iImages [i].style.border = "0";
      iImages [i].setAttribute ("src", "favicon.ico");
      iText [i - 1].innerHTML = "";
    }
    // Adjust to load only available images
    if (intro.length > 0) {
      if (intro.length < nIm) nIm = intro.length + 1;
      for (let i=1; i<nIm; i++) { // i=0 is the logo picture
        let im1 = i - 1;
        let iAlbum = intro [im1].replace (/^([^ ]+).*/, "$1");
        let iName = intro [im1].replace (/^[^ ]+[ ]+([^ ]+)/, "$1");
        if (iName) {
          var imgSrc = linktext + $ ("#imdbLink").text () + iAlbum + "_show_" + iName + ".png";
          let tmp = $ ("#imdbDirs").text ().split ("\n");
          let idx = tmp.indexOf (iAlbum.slice (0, iAlbum.length - 1));
          iImages [i].parentElement.setAttribute ("onclick","parent.selectJstreeNode ("+idx+");parent.gotoMinipic ('" + iName + "')");
          iImages [i].parentElement.setAttribute ("title", "Gå till " + iName); // i18n
          iImages [i].parentElement.style.margin ="0";
          tmp = "I: " + removeUnderscore (iAlbum.slice (1)).replace (/\//g, " > ");
          tmp = tmp.slice (0, tmp.length - 3);
          if (tmp.length < 3) tmp = "";
          iText [im1].innerHTML = tmp;
          iText [im1].style.fontSize = "90%";
          iText [im1].style.verticalAlign = "top";
          iText [im1].style.display = "inline-block";
          iText [im1].style.width = "20em";
          iImages [i].style.width = "19em";
          iImages [i].style.margin = "0.7em 0 0 0";
          iImages [i].style.border = "1px solid gray";
          iImages [i].style.borderRadius = "4px";
        }
        iImages [i].setAttribute ("src", imgSrc);
      }
    }
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Show a symlink's 'parent' album; tgt is a mini-IMG, hopefully a linked one...
async function parentAlbum (tgt) {
  $.spinnerWait (true);
  if (!tgt) {
    await new Promise (z => setTimeout (z, 4000));
    tgt = document.getElementsByClassName ("img_mini") [0].getElementsByTagName ("img") [1];
  }
  $.spinnerWait (true);
  let classes = $ (tgt).parent ("div").parent ("div").attr("class");
  let albumDir, file, tmp, imgs;
  if (classes && -1 < classes.split (" ").indexOf ("symlink")) { // ...yes! a symlink...
    tmp = $ (tgt).parent ("div").parent ("div").find ("img").attr ("title");
    tmp = $ ("#imdbLink").text () + "/" + tmp;
    // ...then go to the linked picture:
    getFilestat (tmp).then (async result => {
      result = result.replace (/(<br>)+/g, "\n");
      result = result.replace(/<(?:.|\n)*?>/gm, ""); // Remove <tags>
      file = result.split ("\n") [0].replace (/^[^/]*\/(\.\.\/)*/, $ ("#imdbLink").text () + "/");
      albumDir = file.replace (/^[^/]+(.*)\/[^/]+$/, "$1").trim ();
      let idx = $ ("#imdbDirs").text ().split ("\n").indexOf (albumDir);
      if (idx < 0) {
        infoDia (null, null, "Tyvärr ...", "<br>Albumet <b>" + albumDir.replace (/^(.*\/)+/, "") + "</b> med den här bilden kan inte visas<br>(rätt till gömda album saknas)", "Ok", true);
        return "";
      }
      // Get the number of imgs in the album; open and read it from the jstree node
      $ (".ember-view.jstree").jstree ("_open_to", "#j1_" + (1 + idx));
      await new Promise (z => setTimeout (z, 400));
      imgs = $ ("#j1_" + (1 + idx) + " a small").text ();
      imgs = Number (imgs.replace (/^.*\(([0-9]+)\).*$/, "$1"));
      if (imgs < 2) imgs = 2; // for a minimum wait time
      $ (".ember-view.jstree").jstree ("close_all");
      $ (".ember-view.jstree").jstree ("_open_to", "#j1_" + (1 + idx));
      $ (".ember-view.jstree").jstree ("deselect_all");
      $ (".ember-view.jstree").jstree ("select_node", $ ("#j1_" + (1 + idx))); // calls selectAlbum
      $ (".ember-view.jstree").jstree ("open_node", $ ("#j1_1"));
      let namepic = file.replace (/^(.*\/)*(.+)\.[^.]*$/, "$2");
      return namepic;
    }).then (async (namepic) => {
      $.spinnerWait (true);
      await new Promise (z => setTimeout (z, 111*imgs)); // proportional pause
      if (namepic) gotoMinipic (namepic);
    });
  } // ...else do nothing
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Position to a minipic and highlight its border, for child window
window.gotoMinipic = function (namepic) {
  later ( ( () => {
    gotoMinipic (namepic);
  }), 4000);
  later ( ( () => {
    userLog ("KLICKA FÖR STÖRRE BILD!", true, 6000)
  }), 6000);
}
// Position to a minipic and highlight its border, 'main' function
function gotoMinipic (namepic) {
  let hs = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  let spinner = document.querySelector("img.spinner");
  let timer;
  (function repeater () {
    timer = setTimeout (repeater, 500)
    if (spinner.style.display === "none") {
      clearTimeout (timer);
      let y, p = $ ("#i" + escapeDots (namepic));
      if (p.offset ()) {
        y = p.offset ().top + p.height ()/2 - hs/2;
      } else {
        y = 0;
      }
      let t = $ ("#highUp").offset ().top;
      if (t > y) {y = t;}
      scrollTo (null, y);
      resetBorders (); // Reset all borders
      $.spinnerWait (false, 3009)
      markBorders (namepic); // Mark this one
    }
  } ());
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function deleteFiles (picNames, nels, picPaths) { // ===== Delete image(s)
  // nels = number of elements in picNames to be deleted
  let delPaths = [];
  var keep = [], isSymlink;
  for (var i=0; i<nels; i++) {
    isSymlink = $ ('#i' + escapeDots (picNames [i])).hasClass ('symlink');
    if (!(allow.deleteImg || isSymlink && allow.delcreLink || allow.adminAll)) {
      keep.push (picNames [i]);
    } else {
      await new Promise (z => setTimeout (z, 50));
      var result = await deleteFile (picPaths [i]);
      if (result.slice (0,3) === "DEL") {
        delPaths.push (picPaths [i]);
      } else {
        console.log (result);
      }
    }
  }
  later ( (async () => {
    userLog (delPaths.length + " DELETED")
    // Delete database entries
    if (delPaths.length > 0) {
      await sqlUpdate (delPaths.join ("\n"));
    }
    if (keep.length > 0) {
      console.log ("No delete permission for " + cosp (keep, true));
      keep = cosp (keep);
      later ( ( () => {
        infoDia (null, null, "Otillåtet att radera", '<br><span  style="color:deeppink">' + keep + '</span>', "Ok", true); // i18n
      }), 100);
    }
    later ( ( () => {
      document.getElementById("reLd").disabled = false;
      $ ("#reLd").trigger ("click");
      document.getElementById("saveOrder").disabled = false;
      $ ("#saveOrder").trigger ("click");
    }), 200);
  }), 2000);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFile (picPath) { // ===== Delete an image
  $ ("#link_show a").css ('opacity', 0);
  return new Promise ( (resolve, reject) => {
    // ===== XMLHttpRequest deleting 'picName'
    var xhr = new XMLHttpRequest ();
    var origpic = picPath;
    xhr.open ('GET', 'delete/' + origpic, true, null, null); // URL matches routes.js with *?
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve (xhr.responseText);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    console.error (error.message);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function sqlUpdate (picPaths) {
  if (!picPaths) return;
  let data = new FormData ();
  data.append ("filepaths", picPaths);
  return new Promise ( (resolve, reject) => {
    let xhr = new XMLHttpRequest ();
    xhr.open ('POST', 'sqlupdate/')
    xhr.onload = function () {
      resolve (xhr.responseText); // empty
    };
    xhr.onerror = function () {
      resolve (xhr.statusText);
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send (data);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Information dialog, bordermarks an image if mentioned (use a fake name if unwanted)
 * @param {string} dialogId Jquery ´dialog name´, defaults to "dialog" if !\<dialogId\> is true
 * @param {string} picName  Name (file base name) of the image that is concerned.
 * If \<picName\> is "" (and \<flag\> false): yes/ok button runs ´serverShell ("temporary_1")´,
 * primarily used for the ´Link to...´ and ´Move to...´ entries on the context menu.
 * @param {string} title  The dialog title (may have HTML tags)
 * @param {string} text   The dialog body information text (may have HTML tags)
 * @param {string} yes    The label for the yes/ok button
 * @param {boolean} modal If true: make the dialog modal, else (or if omitted) don't.
 * @param {boolean} flag  If omitted: false, else if true and picname is ´null´,
 * runs ´eval (<content of #temporary>)´, mostly for the function ´albumEdit´.
 */
function infoDia (dialogId, picName, title, text, yes, modal, flag) { // ===== Information dialog
  if (!dialogId) {dialogId = "dialog";}
  var id = "#" + dialogId;
  if (picName) { //
    resetBorders (); // Reset all borders
    markBorders (picName); // Mark this one
  }
  $ (id).dialog ( { // Initiate dialog
    title: "", // html set below //#
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: modal,
    closeOnEscape: true,
  });
  $ ("div[aria-describedby='" + dialogId + "']").hide ();
  later ( ( () => {
    $ (id).html (text);
    // Define button array
    $ (id).dialog ('option', 'buttons', [
    {
      text: yes, // Okay. See below
        id: "yesBut",
      click: function () {
          if (picName === "") { // Special case: link || move || ...
          $.spinnerWait (true, 108);
          serverShell ("temporary_1");

          // Extract/construct sqlUpdate file list if there are any
          // move=... moveto=... lines in #temporary_1
          // Note: Files to be moved from #picFound and have got a random
          // postfix are symlinks and thus ignored in any case by sqlUpdate
          // (Why I do say that? Since a moved symlink has lost its random name postfix...)
          let txt = document.getElementById ("temporary_1").innerHTML.split (";");
          let files = [];
          for (let i=0; i<txt.length; i++) {
            if (txt [i].indexOf ("move") === 0) {
              files.push (txt [i].replace (/^[^=]+=/, ""));
            }
          }
          for (let i=0; i<files.length; i+= 2) {
            let name = files [i].replace (/^(.*\/)*/, "");
            files [i + 1] = files [i + 1] + name;
          }
          files = files.join ("\n");
          if (files.length > 0) {
            later ( ( () => {
              document.getElementById("reLd").disabled = false;
              $ ("#reLd").trigger ("click");
            }), 800);
            later ( (async () => {
              await sqlUpdate (files);
            }), 5000);
          }
          $.spinnerWait (false, 2010)
        }
        $ (this).dialog ("close");
        $ ('#navKeys').text ('true'); // Reset in case L/R arrows have been protected
        if (flag && !picName) { // Special case: evaluate #temporary, probably for albumEdit
          console.log ($ ("#temporary").text ());
          eval ($ ("#temporary").text ());
          return true;
        }
        // If this is the second search (result) dialog:
        if (yes.indexOf ("Visa i") > -1) {
          $.spinnerWait (true, 109);
          document.getElementById("reLd").disabled = false;
          later ( ( () => {
            $ ("#reLd").trigger ("click");
          }), 1999);
        }
        $ ("#yesBut").html (yes);
        return true;
      }
    }]);
    $ ("div[aria-describedby='" + dialogId + "'] span.ui-dialog-title").html (title); //#
    niceDialogOpen (dialogId);
    $ ("#yesBut").html (yes);
  }), 33);
  $ ("#yesBut").focus ();
  $ ("div[aria-describedby='" + dialogId + "']").show ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function favDia (text, addfile, addmarked, savecook, closeit, savefile, findshow, cleanup) { // ===== Show favorites dialog
  // the arguments = the favorite text list and all the rest button texts
  $ ("#dialog").dialog ('destroy').remove ();
  let favs = "Favoritbilder"; // i18n
  $ ('<div id="dialog"><textarea class="favorites" name="favorites" placeholder="Skriv in favoriter = bildnamn som ska sparas" rows="16" cols="32"></textarea></div>').dialog ( { // Initiate dialog
    title: favs,
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: false,
    closeOnEscape: true,
    resizable: false,
    close: () => { // clean up:
      $ ("#favFile").remove ();
      $ ("#txtDispl").remove ();
      $ ("#favName").remove ();
      $ ("button.fileFavs").parent ().removeAttr('style');
    }
  });
  // Improve 'dialog title':
  $ ("div[aria-describedby='dialog'] span.ui-dialog-title").html (" <span class='blue'>" + favs + "</span>");
  // Define button array
  $ ("#dialog").dialog ("option", "buttons", [
    {
      text: addfile,
      class: "fileFavs",
      click: function () {
        $ ("#favName") [0].value = "";
        $ ("#favFile").trigger ("click");
      }
    },
    {
      text: addmarked,
      class: "addFavs",
      click: function () {
        let newfav = "";
        let nodes = document.getElementsByClassName ("markTrue");
        for (let i=0; i<nodes.length; i++) {
          let str = nodes [i].nextElementSibling.innerHTML.trim ();
          if ($ ("#imdbDir").text ().replace (/^[^/]+\//, "") === $ ("#picFound").text ()) {
            str = str.replace (/\.[^.]{4}$/, "");
          }
          newfav += str + "\n";
        }
        let text = $ ('textarea[name="favorites"]').val ().trim ();
        var texar = $ ('textarea[name="favorites"]') [0];
        $ ('textarea[name="favorites"]').val ( (text + "\n" + newfav).trim ());
        texar.scrollTop = texar.scrollHeight;
        texar.focus ();
      }
    },
    {
      text: savecook,
      class: "cookFavs",
      click: function () {
        let text = $ ('textarea[name="favorites"]').val ().trim ();
        saveFavorites (text);
        $ ('textarea[name="favorites"]').focus ();
      }
    },
    {
      text: closeit,
      class: "closeFavs",
      click: function () {
        $ (this).dialog ("close");
      }
    },
    {
      text: savefile,
      class: "saveFavs",
      click: function () {
        let fileAdvice = "TYVÄRR: Ännu finns ingen standard för att spara lokala filer med webbläsare (förutom via nedladdningslänkar etc.).  Därför:\n\n"
        fileAdvice += "Om du inte nöjer dig med att spara bara en enda favoritlista (med ";
        fileAdvice += "den mindre av [Spara]-knapparna) så måste du spara dem manuellt — i ";
        fileAdvice += "textfiler på din dator. Gör så här:\n\n";
        fileAdvice += "1.  Markera och kopiera listan i favoritfönstret (som med till exempel Ctrl + C).\n\n";
        fileAdvice += "2.  Spara den med hjälp av en textredigerare (Anteckningar/Notepad eller liknande) som textfil med det namn och i den ";
        fileAdvice += "katalog (folder) som du själv väljer.\n\n";
        fileAdvice += "Sedan kan du med  [ Hämta fil ]  hämta din favoritlista därifrån — du kan spara olika favoritlistor att välja bland i samma katalog.\n\n";
        fileAdvice += "OBSERVERA: Det måste vara textfiler med namnslut ´.txt´ eller ´.text´!\n\n";
        fileAdvice += "TIPS: Första raden blir visningsrubrik om den börjar med ett #-tecken.";
        alert (fileAdvice);
      }
    },
    {
      text: findshow,
      class: "showFavs",
      click: function () {
        let text = $ ('textarea[name="favorites"]').val ().trim (); // Important
        if (text.length < 3) return;
        if (text.slice (0, 1) === "#") {
          let hdrTxt = text.replace (/[\n]/g, "#");
          hdrTxt = hdrTxt.replace (/^#([^#]*)#.*$/, "$1").replace (/_/g, " ");
          centerMarkSave = hdrTxt;
          $ ("span.centerMark").text (centerMarkSave);
        } else {
          $ ("span.centerMark").text ("×");
        }
        saveFavorites (text);
        $ (this).dialog ("close");
        text = text.replace (/[ \n]+/g, " ").trim ();
        // Save this album as previous:
        savedAlbumIndex = $ ("#imdbDirs").text ().split ("\n").indexOf ($ ("#imdbDir").text ().slice ($ ("#imdbLink").text ().length));
        // Place the namelist in the picFound album still if not yet chosen
        // Preset imdbDir 'in order to cheat' saveOrderFunc
        $ ("#imdbDir").text ($ ("#imdbLink").text () +"/"+ $ ("#picFound").text ());
        // Populate the picFound album with favorites in namelist order:
        doFindText (text, false, [false, false, false, false, true], true);
        $.spinnerWait (true, 110);
      }
    },
    {
      text: cleanup,
      class: "eraseFavs",
      click: function () {
        $ ('textarea[name="favorites"]').val ("");
      }
    },
  ]);
  //$ ("#dialog").dialog ("open");
  niceDialogOpen ();
  var tmp = $ ("#dialog").prev ().html ();
  // Why doesn't the close button work? Had to add next line to get it function:
  tmp = tmp.replace (/<button/,'<button onclick="$(\'#dialog\').dialog(\'close\')" title="' + close + '"');
  $ ("#dialog").prev ().html (tmp);
  $ ('textarea[name="favorites"]').val ("");
  niceDialogOpen ("dialog");
  // Unvisible file input + iframe as file text content storage
  $ (".fileFavs").before ('<input id="favFile" type="file" accept="text/plain" style="display:none"><iframe id="txtDispl" style="display:none" draggable="false" ondragstart="return false"></iframe>');
  // Visible file name text field
  $ (".fileFavs").parent ().after ('<input id="favName" type="text" style="width:99%;text-align:left;border:0">');
  $ ("button.closeFavs").after ("<br>");
  $ ("button.fileFavs").parent ().css ("text-align", "left");
  $ ("button.saveFavs").parent ().css ("padding-left", "0.2em");

  $ ("button.fileFavs").css ("width", "10em");
  $ ("button.fileFavs").css ("color", "blue");
  $ ("button.saveFavs").css ("width", "10em");
  $ ("button.saveFavs").css ("color", "blue");

  const inputElement = document.getElementById("favFile");
  inputElement.addEventListener("change", handleFiles, false);
  function handleFiles() {
    const fileList = this.files; /* now you can work with the file list */
    const oURL = URL.createObjectURL(fileList [0]);
    const txtDispl = document.getElementById ("txtDispl");
    txtDispl.setAttribute ("src", oURL); // use the path (oURL) here ...
    // Since this is an iframe, must use ´contentWindow´:
    later ( ( () => {
      text = txtDispl.contentWindow.document.querySelector ("body pre").innerText.trim ();
      $ ('textarea[name="favorites"]').val (text);
      $ ("#favName") [0].value = fileList [0].name + "     " + text.split ("\n").length;
      URL.revokeObjectURL (oURL); // release
    }), 40);
  }

  $ ('textarea[name="favorites"]').focus ();
  later ( ( () => {
    $ ('textarea[name="favorites"]').val (text);
  }), 40);
  $ ("#dialog").css ("padding", "0");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function notesDia (picName, filePath, title, text, save, saveClose, close) { // ===== Text dialog
  $ ("#notes").dialog ('destroy').remove ();
  if (picName) { //
    resetBorders (); // Reset all minipic borders
    markBorders (picName); // Mark this one
  }
  $ ('<div id="notes"><textarea class="notes" name="notes" placeholder="Anteckningar (för Xmp.dc.source) som inte visas med bilden" rows="8"></textarea></div>').dialog ( { // Initiate dialog
    title: title,
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: true,
    closeOnEscape: true,
    resizable: false
  });
  // Improve 'dialog title':
  $ ("div[aria-describedby='notes'] span.ui-dialog-title").html (title + " <span class='blue'>" + picName + "</span>");

  function notesSave () { // NOTE: This way to save metadata is probably the most efficient, and
    // 'xmpset' should perhaps ultimately replace 'set_xmp_creatior' and 'set_xmp_description'?
    // Remove extra spaces and convert to <br> for saving metadata in server image:
    text = $ ('textarea[name="notes"]').val ().replace (/  */g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    fileWR (filePath).then (acc => {
      if (acc !== "WR") {
        userLog ("NOT written");
        infoDia (null, null,"Texten kan inte sparas", "<br><span class='pink'>" + picName + "</span> ändringsskyddad, försök igen<br><br>Om felet kvarstår:<br>Kontrollera filen!", "Stäng", true);
      } else {
        // Remove <br> in the text shown; use <br> as is for metadata
        $ ('textarea[name="notes"]').val (text.replace (/<br>/g, "\n"));
        // Link: filePath correct?
        execute ("xmpset source " + filePath + ' "' + text.replace (/"/g, '\\"')+ '"').then ( () => {
          userLog ("TEXT written", false, 2000);
        });
      }
    });
  }
  // Define button array
  $ ("#notes").dialog ("option", "buttons", [
    {
      text: save,
      class: "saveNotes",
      click: function () {
        notesSave ();
      }
    },
    {
      text: saveClose,
      class: "saveNotes",
      click: function () {
        notesSave ();
        $ (this).dialog ("close");
      }
    },
    {
      text: close,
      class: "closeNotes",
      click: function () {
        $ (this).dialog ("close");
      }
    }
  ]);
  //$ ("#notes").dialog ("open");
  niceDialogOpen ("notes");
  var tmp = $ ("#notes").prev ().html ();
  //tmp = tmp.replace (/<span([^>]*)>/, "<span$1><span>" + picName + "</span> &nbsp ");
  // Why doesn't the close button work? Had to add next line to get it function:
  tmp = tmp.replace (/<button/,'<button onclick="$(\'#notes\').dialog(\'close\');"');
  $ ("#notes").prev ().html (tmp);
  $ ('textarea[name="notes"]').html ("");
  niceDialogOpen ("notes");
  later ( ( () => {
    niceDialogOpen ("notes");
    $ ('textarea[name="notes"]').focus (); // Positions to top *
    if (!(allow.notesEdit || allow.adminAll)) {
      $ ('textarea[name="notes"]').attr ("disabled", true);
      $ ("button.saveNotes").attr ("disabled", true);
      $ ("button.closeNotes").focus ();
    }
    $ ('textarea[name="notes"]').html (text.replace (/<br>/g, "\n"));
  }), 40);
  // Why doesn't the 'close-outside' work? Had to add this to get it function:
  $ ('.ui-widget-overlay').bind ('click', function () {
    $ ('#notes').dialog ("close");
  });
  $ ("#notes").css ("padding", "0");
  //document.querySelector('textarea[name="notes"]').scrollTop = 0; // * Doesn't work
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function niceDialogOpen (dialogId) {
  if (!dialogId) {dialogId = "dialog";}
  var id = "#" + dialogId;
  $ (id).width ("auto");
  $ (id).parent ().height ("auto");
  $ (id).height ("auto");
  $ (id).parent ().css ("max-height", "");
  $ (id).css ("max-height","");
  $ (id).dialog ("open");
  // For jquery-ui-touch-punch, here maybe useful, may make some dialogs opened here
  // draggable on smartphones. Less useful in other cases (search for them),
  // and it does prohibit data entry in textareas
  // Well, bad idea, since it prohibits text copy with computer!
  //if (id === "#dialog") {
  //  $ (id).parent ().attr ({draggable: "true"});
  //}
  var esw = ediTextSelWidth () - 100;
  let sw = parseInt ( (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth)*0.95);
  $ (id).parent ().css ("min-width", "300px");
  $ (id).parent ().css ("max-width", sw+"px");
  $ (id).width ("auto");

  let tmp = $ (id).parent ().parent ().outerWidth (); // helpText??
  let pos = $ (id).parent ().position ();
  if (tmp < esw) esw = tmp;
  if (pos.left < 2 || pos.left + esw > sw/0.95 + 10) {
    var diaDivLeft = parseInt ( (sw - esw)/2) + "px";
    $ (id).parent ().css ("left", diaDivLeft);
  }
  $ (id).parent ().width (esw + "px");
  $ (id + " textarea").width ((esw - 15) + "px");
  var up = 128;
  let hs = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  $ (id).parent ().css ("max-height", hs + "px");
  $ (id).css ("max-height", hs - up + "px");
  $ (id).parent ().draggable ();
  if (pos.top < 0) $ (id).parent ().css ("top", "2px");
  // NOTE, nodes above are JQuery objects
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Close the ediText dialog and return false if it wasn't already closed, else return true
function ediTextClosed () {
  $ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ("");
  $ (".ui-dialog-buttonset button:first-child").css ("float", "none");
  $ (".ui-dialog-buttonset button.keys").css ("float", "none");
  $ (".ui-dialog-buttonset button:first-child").attr ("title", "");
  $ (".ui-dialog-buttonset button.keys").attr ("title", "");
  if ($ ("div[aria-describedby='textareas']").css ("display") === "none") {
    return true; // It is closed
  } else {
    $ ("div[aria-describedby='textareas']").hide ();
    $ ('#navKeys').text ('true');
    return false; // It wasn't closed (now it is)
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function hideFunc (picNames, nels, act) { // ===== Execute a hide request
  // nels = number of elements in picNames to be acted on, act = hideFlag
  for (var i=0; i<nels; i++) {
    var picName = picNames [i];
    var sortOrder = $ ("#sortOrder").text ();
    var k = sortOrder.indexOf (picName + ",");
    var part1 = sortOrder.substring (0, picName.length + k + 1);
    var part2 = sortOrder.slice (picName.length + k + 1);
    k = part2.indexOf (",");
    var hideFlag = ('z' + act).slice (1); // Set 1 or 0 and convert to string
    sortOrder = part1 + hideFlag + part2.slice (k); // Insert the new flag
    $ ("#i" + escapeDots (picName)).css ('background-color', $ ("#bkgrColor").text ());
    $ ("#wrap_show").css ('background-color', $ ("#bkgrColor").text ());
    if (hideFlag === "1") { // If it's going to be hidden: arrange its CSS ('local hideFlag')
      $ ("#i" + escapeDots (picName)).css ('background-color', $ ("#hideColor").text ());
      $ ("#wrap_show").css ('background-color', $ ("#hideColor").text ()); // *Just in case -
      // The 'global hideFlag' determines whether 'hidden' pictures are visible or not
      if ($ ("#hideFlag").text () === "1") { // If hiddens ARE hidden, hide this also
        $ ("#i" + escapeDots (picName)).hide ();
      }
    }
    $ ("#sortOrder").text (sortOrder); // Save in the DOM
  }
  //Update picture numbers:
  var tmp = document.getElementsByClassName ("img_mini");
  var numHidden = 0, numTotal = tmp.length;
  for (i=0; i<numTotal; i++) {
    if (tmp [i].style.backgroundColor === $ ("#hideColor").text ()) {
      numHidden = numHidden + 1;
    }
  }
  if ($ ("#hideFlag").text () === "1") {
    $ (".numHidden").text (numHidden);
    $ (".numShown").text (numTotal - numHidden);
  } else {
    $ (".numHidden").text ("0");
    $ (".numShown").text (numTotal);
  }
  if (numTotal) {
    $ ("span.ifZero").show ();
  } else {
    $ ("span.ifZero").hide ();
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function linkFunc (picNames) { // ===== Execute a link-these-files-to... request
  // picNames should also be saved as string in #picNames
  var albums = $ ("#imdbDirs").text ();
  albums = albums.split ("\n");
  var curr = $ ("#imdbDir").text ().match(/\/.*$/); // Remove imdbLink
  if (curr) {curr = curr.toString ();} else {curr = "";}
  var lalbum = [];
  var i;
  for (i=0; i<albums.length; i++) { // Remove current album from options
    if (albums [i] !== curr) {lalbum.push (albums [i]);}
  }
  //var rex = /^[^/]*\//;
  var codeLink = "'var lalbum=this.value;var lpath = \"\";if (this.selectedIndex === 0) {return false;}lpath = lalbum.replace (/^[^/]*(.*)/, $ (\"#imdbLink\").text () + \"$1\");console.log(\"Link to\",lpath);var picNames = $(\"#picNames\").text ().split (\"\\n\");var cmd=[];for (var i=0; i<picNames.length; i++) {var linkfrom = document.getElementById (\"i\" + picNames [i]).getElementsByTagName(\"img\")[0].getAttribute (\"title\");linkfrom = \"../\".repeat (lpath.split (\"/\").length - 1) + linkfrom;var linkto = lpath + \"/\" + picNames [i];linkto += linkfrom.match(/\\.[^.]*$/);cmd.push(\"ln -sf \"+linkfrom+\" \"+linkto);}$ (\"#temporary\").text (lpath);$ (\"#temporary_1\").text (cmd.join(\"\\n\"));$ (\"#checkNames\").trigger (\"click\");'";

  var r = $ ("#imdbRoot").text ();
  var codeSelect = '<select class="selectOption" onchange=' + codeLink + '>\n<option value="">Välj ett album:</option>';
  for (i=0; i<lalbum.length; i++) {
    var v = r + lalbum [i];
    codeSelect += '\n<option value ="' +v+ '">' +v+ '</option>';
  }
  codeSelect += "\n</select>"
  codeSelect += '<br>(eller avbryt med "Ok" utan att välja album)';
  var title = "Länka till annat album";
  var text = cosp (picNames) +"<br>ska länkas till<br>" + codeSelect;
  var modal = true;
  infoDia (null, "", title, text, "Ok", modal); // Trigger infoDia run 'serverShell("temporary_1")'
  $ ("select.selectOption").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function moveFunc (picNames, picOrder) { // ===== Execute a move-these-files-to... request
  // When moveFunc is called, picNames should also be saved as string in #picNames
  // MoveFunc SHOULD reset #imdbDir to the target album and ALSO update its server #sortOrder!
  var albums = $ ("#imdbDirs").text (); // Album paths available
  albums = albums.split ("\n");
  let curr = $ ("#imdbDir").text ().match(/\/.*$/); // Remove imdbLink from current album path
  let picf = $ ("#picFound").text () // Remove if possibly picFound
  if (curr) curr = curr.toString (); else curr = ""; // ??
  let malbum = [];
  for (let i=0; i<albums.length; i++) { // Remove current and find result albums from options
    if (albums [i] !== curr && albums [i].indexOf (picf) < 0) {
      malbum.push (albums [i]);
    }
  }
  // The following will move even links, where link source is corrected and with even
  // deletion of the random postfix from picture names for links moved from #picFound.

  //   malbum = album selected to move pictures into
  //    mpath = the corresponding actual path, moveto = mpath/
  // picNames = the names* of the pictures in the current album to be moved
  // move|mini|show = the path to the original|mini|show pictures to be moved
  // picfound = the name of the temporary album where found pictures are kept
  // picfound in the path means that a random postfix has to be removed from names*

  // Beware of the algorithm with all regular expression escapes in the text put into
  // #temporary_1, a Bash text string containing in the magnitude of 1000 characters,
  // depending on actual file names, but well within the Bash line length limit.

  !picOrder; !moveOrder; // Dummy calls, for names only referenced in codeMove:

  var codeMove = "'var malbum=this.value;var mpath=\"\";if(this.selectedIndex===0){return false;}mpath=malbum.replace (/^[^/]*(.*)/,$(\"#imdbLink\").text()+\"$1\");var lpp=mpath.split(\"/\").length-1;if (lpp > 0)lpp=\"../\".repeat(lpp);else lpp=\"./\";console.log(\"Trying move to\",malbum);var picNames=$(\"#picNames\").text().split(\"\\n\");var picOrder=$(\"#picOrder\").text().split(\"\\n\");console.log(picNames,picOrder);cmd=[];for (let i=0;i<picNames.length;i++){var move=$(\"#imdbLink\").text()+\"/\"+document.getElementById(\"i\"+picNames[i]).getElementsByTagName(\"img\")[0].getAttribute(\"title\");var mini=move.replace(/([^/]+)(\\.[^/.]+)$/,\"_mini_$1.png\");var show=move.replace(/([^/]+)(\\.[^/.]+)$/,\"_show_$1.png\");var moveto=mpath+\"/\";var picfound=$(\"#picFound\").text();cmd.push(\"picfound=\"+picfound+\";move=\"+move+\";mini=\"+mini+\";show=\"+show+\";orgmove=$move;orgmini=$mini;orgshow=$show;moveto=\"+moveto+\";lpp=\"+lpp+\";lnksave=$(readlink -n $move);if [ $lnksave ];then move=$(echo $move|sed -e \\\"s/\\\\(.*$picfound.*\\\\)\\\\.[^.\\\\/]\\\\+\\\\(\\\\.[^.\\\\/]\\\\+$\\\\)/\\\\1\\\\2/\\\");mini=$(echo $mini|sed -e \\\"s/\\\\(.*$picfound.*\\\\)\\\\.[^.\\\\/]\\\\+\\\\(\\\\.[^.\\\\/]\\\\+$\\\\)/\\\\1\\\\2/\\\");show=$(echo $show|sed -e \\\"s/\\\\(.*$picfound.*\\\\)\\\\.[^.\\\\/]\\\\+\\\\(\\\\.[^.\\\\/]\\\\+$\\\\)/\\\\1\\\\2/\\\");lnkfrom=$(echo $lnksave|sed -e \\\"s/^\\\\(\\\\.\\\\{1,2\\\\}\\\\/\\\\)*//\\\" -e \\\"s,^,$lpp,\\\");lnkmini=$(echo $lnkfrom|sed -e \\\"s/\\\\([^/]\\\\+\\\\)\\\\(\\\\.[^/.]\\\\+\\\\)\\\\$/_mini_\\\\1\\\\.png/\\\");lnkshow=$(echo $lnkfrom|sed -e \\\"s/\\\\([^/]\\\\+\\\\)\\\\(\\\\.[^/.]\\\\+\\\\)\\\\$/_show_\\\\1\\\\.png/\\\");ln -sfn $lnkfrom $move;fi;mv -n $move $moveto;if [ $? -ne 0 ];then if [ $move != $orgmove ];then rm $move;fi;exit;else if [ $lnksave ];then ln -sfn $lnkmini $mini;ln -sfn $lnkshow $show;fi;mv -n $mini $show $moveto;if [ $move != $orgmove ];then rm $orgmove;fi;if [ $mini != $orgmini ];then rm $orgmini;fi;if [ $show != $orgshow ];then rm $orgshow;fi;fi;\");console.log(move,mini,show,moveto);}$(\"#temporary\").text(mpath);$(\"#temporary_1\").text (cmd.join(\"\\n\"));'"
  // A log ...\");console.log(move,mini,show,moveto);}$...
  // may be inserted and is printed even at failure (now removed).
  // Here checkNames cannot be called (like in linkFunc) since  #temporary_1 is not usable

  console.log("codeMove",codeMove);
  let r = $ ("#imdbRoot").text ();
  let codeSelect = '<select class="selectOption" onchange=' + codeMove + '><option value="">Välj ett album:</option>';
  //console.log(codeSelect);
  for (let i=0; i<malbum.length; i++) {
    let v = r + malbum [i];
    codeSelect += '<option value ="' +v+ '">' +v+ '</option>';
  }
  codeSelect += "</select>"
  codeSelect += '<br>(eller avbryt med "Ok" utan att välja album)';
  //console.log("codeSelect",codeSelect);
  let title = "Flytta till annat album";
  let text = cosp (picNames) +"<br>ska flyttas till<br>" + codeSelect;
  let modal = true;
  infoDia (null, "", title, text, "Ok", modal); // Trigger infoDia run serverShell ("temporary_1")
  $ ("select.selectOption").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var moveOrder = async (mpath, picNames) => { // ===== Sort-order-list "from outside"
  console.log("mpath",mpath,"picOrder",picNames);
  if (!mpath) return;
  let spath = $ ("#imdbDir").text ();
  $ ("#imdbDir").text (mpath);
  let olist = await getOrder ().trim ();
  let alist = olist.split ("\n");
  for (let i=0; i<picNames.length; i++) {
    alist.push (picNames [i].trim () + ",0,0");
  }
  olist = alist.join ("\n");
  await saveOrderFunc (olist).then ( () => {return});
  $ ("#imdbDir").text (spath); // Maybe remove?? try it [this line is dubious!]

  function getOrder () { // This function was built on an exerpt from "requestOrder ()"
    return new Promise ( (resolve, reject) => {
      var IMDB_DIR = $ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For passing sub-directories
      var xhr = new XMLHttpRequest ();
      xhr.open ('GET', 'sortlist/' + IMDB_DIR, true, null, null); // URL matches server-side routes.js
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.responseText.trim ();
          if (data.slice (0, 8) === '{"error"') {
            //data = undefined;
            data = "Error!"; // This error text may also be generated elsewhere
          }
          resolve (data); // Return file-name text lines
          console.log ("ORDER received");
        } else {
          resolve ("Error!");
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        resolve ("Error!");
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    }).catch (error => {
      console.error (error.message);
    });
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const saveOrderFunc = namelist => { // ===== XMLHttpRequest saving the thumbnail order list
  if (!(allow.saveChanges || allow.adminAll || imdbDir_is_picFound ()) || $ ("#imdbDir").text () === "") Promise.resolve (true);
  document.getElementById ("divDropbox").className = "hide-all"; // If shown...
  return new Promise ( (resolve, reject) => {
    $ ("#sortOrder").text (namelist); // Save in the DOM
    if (!$ ("#imdbDir").text ()) $ ("#imdbDir").text ($ ("#imdbLink").text ()); // Empty at root
    var IMDB_DIR =  $ ('#imdbDir').text ();
    if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
    IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
    var xhr = new XMLHttpRequest ();
    xhr.open ('POST', 'saveorder/' + IMDB_DIR); // URL matches server-side routes.js
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        userLog ("SAVE", false, 1000);
        resolve (true); // Can we forget 'resolve'?
      } else {
        userLog ("SAVE error", false, 5000);
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.send (namelist);
  }).catch (error => {
    console.error (error.message);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function saveFavorites (favList) {
  favList = favList.trim ();
  var favArr = favList.split ("\n");
  for (let i=0; i<favArr.length; i++) {
    if (favArr [i].slice (0, 1) === "#") favArr [i] = favArr [i].replace (/ /g, "_");
  }
  favList = favArr.join (" ");

  let txt = " #String_too_long,_thruncated ";
  if (favList.length > 4000) favList = (txt + favList.slice (0, 4000) + txt).trim ();

  setCookie ("favorites", favList, 0);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function userLog (message, flashOnly, mstime) { // ===== Message to the log file and flash the user
  if (!flashOnly) {
    console.log (message);
    /*var messes = $ ("#title span.usrlg").text ().trim ().split ("•");
    if (messes.length === 1 && messes [0].length < 1) {messes = [];}
    if (!(messes.length > 0 && messes [messes.length - 1].trim () === message.trim ())) {messes.push (message);}
    if (messes.length > 5) {messes.splice (0, messes.length -5);}
    messes = messes.join (" • ");*/
    // discontinued: $ ("#title span.usrlg").text (messes);
  }
  if (mstime) {
    $ (".shortMessage").text (message);
    $ (".shortMessage").show ();
    later ( ( () => {
      $ (".shortMessage").hide ();
    }), mstime);
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reqRoot () { // Propose root directory (requestDirs)
  return new Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'rootdir/', true, null, null);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var dirList = xhr.responseText;
        resolve (dirList);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    if (error.status !== 404) {
      console.error (error.message);
    } else {
      console.warn ("reqRoot: No NodeJS server");
    }
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reqDirs (imdbroot) { // Read the dirs in imdbLink (requestDirs)
  if (imdbroot === undefined) return;
  $.spinnerWait (true, 111);
  return new Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    // Here also #picFound is sent to the server for information/update
    xhr.open ('GET', 'imdbdirs/' + imdbroot + "@" + $ ("#picFound").text (), true, null, null);
    xhr.onload = function () {
      //$.spinnerWait (false);
      if (this.status >= 200 && this.status < 300) {
        var dirList = xhr.responseText;
        dirList = dirList.split ("\n");
        var dim = (dirList.length - 2)/3;
        var dirLabel = dirList.splice (2 + 2*dim, dim);
        var dirCoco = dirList.splice (2 + dim, dim);
        $ ("#userDir").text (dirList [0].slice (0, dirList [0].indexOf ("@")));
        $ ("#imdbRoot").text (dirList [0].slice (dirList [0].indexOf ("@") + 1));
        $ ("#imdbLink").text (dirList [1]);
        var imdbLen = dirList [1].length;
        dirList = dirList.slice (1);
        var nodeVersion = dirList [dirList.length - 1];
        var nodeText = $ (".lastRow").html (); // In application.hbs
        nodeText = nodeText.replace (/NodeJS[^•]*•/, nodeVersion +" •");
        $ (".lastRow").html (nodeText); // In application.hbs
        // Remove the last line
        dirList.splice (dirList.length - 1, 1);
        // Remove ...???
        for (let i=0; i<dirList.length; i++) {
          dirList [i] = dirList [i].slice (imdbLen);
        }
        let newList = [], newCoco = [], newLabel = [];
        // The length of "." + the random postfix is 5:
        let test = $ ("#picFound").text ();
        test = test.slice (0, test.length - 5);
        for (let i=0; i<dirList.length; i++) {
          if (dirList [i].slice (1, test.length+1) !== test || dirList [i].slice (1) === $ ("#picFound").text ()) {
            newList.push (dirList [i])
            newCoco.push (dirCoco [i])
            newLabel.push (dirLabel [i])
          }
        }
        dirList = newList;
        dirCoco = newCoco;
        dirLabel = newLabel;

        // Remove "ignore" albums from the list if not allowed, starred in dirCoco
        if (!(allow.textEdit || allow.adminAll)) {
          newList = [], newCoco = [], newLabel = [];
          for (let j=0; j<dirList.length; j++) {
            if (dirCoco [j].indexOf ("*") < 0) {
              newList.push (dirList [j])
              newCoco.push (dirCoco [j])
              newLabel.push (dirLabel [j])
            }
          }
          dirList = newList;
          dirCoco = newCoco;
          dirLabel = newLabel;

        } else { // Modify the star appearance
          for (let j=0; j<dirCoco.length; j++) {
            dirCoco [j] = dirCoco [j].replace (/\*/, "—*");
          }
        }
        // Don't keep current album visible if not in dirList:
        let curr = $ ("#imdbDir").text ().match(/\/.*$/); // Remove imdbLink
        if (curr) {curr = curr.toString ();} else {
          curr = "£"; // Side effect: imdb cannot be hidden
        }
        let ix = dirList.indexOf (curr);
        if ($ ("#imdbDir").text ().length > 0 && ix < 0) {
          document.getElementById ("imageList").className = "hide-all";
          $ ("#imdbDir").text (""); // Remove active album
        } else { // ... but save for selection if present in dirList:
          tempStore = ix + 1;
        }
        dirList = dirList.join ("\n");
        $ ("#imdbDirs").text (dirList);
        dirCoco = dirCoco.join ("\n");
        $ ("#imdbCoco").text (dirCoco);
        dirLabel = dirLabel.join ("\n"); // Don't trim!
        $ ("#imdbLabels").text (dirLabel);
        resolve (dirList);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    if (error.status !== 404) {
      console.error (error.message);
    } else {
      console.log (error.status, error.statusText, "or NodeJS server error?");
    }
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getBaseNames (IMDB_DIR) { // ===== Request imgfile basenames from a server directory
  return new Promise ( (resolve, reject) => {
    if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
    IMDB_DIR = IMDB_DIR.replace (/\//g, "@");
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'basenames/' + IMDB_DIR, true, null, null);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var result = xhr.responseText;
        //userLog ('NAMES received');
        resolve (result);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    console.error (error.message);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getFilestat (filePath) { // Request a file's statistics/information
  return new Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'filestat/' + filePath.replace (/\//g, "@"), true, null, null);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var data = xhr.responseText.trim ();
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function fileWR (filePath) { // Request a server file's exist/read/write status/permission
  // Returns '', 'R', or 'WR', indicating missing, readable, or read/writeable
  return new Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'wrpermission/' + filePath.replace (/\//g, "@"), true, null, null);
    //console.log(filePath);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var data = xhr.responseText.trim ();
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function resetBorders () { // Reset all mini-image borders and SRC attributes
  var minObj = $ (".img_mini img.left-click");
  minObj.css ('border', '0.25px solid #888');
  //console.log("--- resetBorders");
  minObj.removeClass ("dotted");
  // Resetting all minifile SRC attributes ascertains that any minipic is shown
  // (maybe created just now, e.g. at upload, any outside-click will show them)
  for (var i=0; i<minObj.length; i++) {
    var toshow = minObj [i];
    var minipic = toshow.src;
    $ (toshow).removeAttr ("src").attr ("src", minipic);
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function markBorders (picName) { // Mark a mini-image border
  $ ('#i' + escapeDots (picName) + ".img_mini img.left-click").addClass ("dotted");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
window.markBorders = function (picName) { // Mark a mini-image border
  $ ('#i' + escapeDots (picName) + ".img_mini img.left-click").addClass ("dotted");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function escapeDots (txt) { // Escape dots, for CSS names
  // Use e.g. when file names are used in CSS, #<id> etc.
  return txt.replace (/\./g, "\\.");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function cosp (textArr, system) { // Convert an array of text strings
  // into a comma+space[and]-separated text string
  var andSep = " och"; // i18n
  if (system) {andSep = ", and"}
  if (textArr.length === 1) {return textArr [0]} else {
    return textArr.toString ().replace (/,/g, ", ").replace (/,\s([^,]+)$/, andSep + " $1")
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function removeUnderscore (textString, noHTML) {
  return textString.replace (/_/g, noHTML?" ":"&nbsp;");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function extractContent(htmlString) { // Extracts text from an HTML string
  var span= document.createElement('span');
  span.innerHTML = htmlString;
  return span.textContent || span.innerText;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function devSpec () { // Device specific features/settings
  // How do we make context menus with iPad/iOS?
  if ( (navigator.userAgent).includes ("iPad")) {
    /*/ Disable iOS overscroll
    document.body.addEventListener('touchmove', function(event) {
      event.preventDefault();
    }, false);*/
    $ (".nav_.qnav_").hide (); // the help link, cannot use click-in-picture...
    $ ("#full_size").hide (); // the full size image link
    $ (".nav_.pnav_").hide (); // the print link
  }
  if (window.screen.width < 500) {
    $ ("#full_size").hide (); // the full size image link
    $ ("#do_print").hide (); // the printout link
    $ ("a.toggleAuto").hide (); // slide show button
  }
  return false;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function disableSettings () { // Disables the confirm button, and all checkboxes
  //document.querySelector ('div.settings button.confirm').disabled = true;
  $ ("div.settings button.confirm").prop ("disabled", true);
  for (var i=0; i<allowvalue.length; i++) {
    document.querySelectorAll ('input[name="setAllow"]') [i].disabled = true;
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function aData (dirList) { // Construct the jstree data template from dirList
  var d = dirList;  // the dirList vector should be strictly sorted
  for (i=0; i<dirList.length; i++) {
    d [i] = d [i].replace (/^[^/]*/, ".");
  }
  var r = ''; // for resulting data
  if (d.length <1) {return r;}
  var i = 0, j = 0;
  var li_attr = 'li_attr:{onclick:"return false",draggable:"false",ondragstart:"return false"},';
  // The first element ('dirList [0]') is the link to the root dir (with no '/'):
  r = '[ {text:"' + dirList [0] + '",' + 'a_attr:{title:"' + d [0] + '"},' +li_attr+ '\n';
  var nc = -1; // children level counter
  var b = [dirList [0]];
  for (i=1; i<dirList.length; i++) {
    // The following elements of 'd' (1, 2, ...):
    var a_attr = 'a_attr:{title:"' + d [i] + '"},'
    var s = b; // branch before
    b = dirList [i].split ("/"); // branch
    if (b.length > s.length) { // start children
      r += 'children: [\n';
      nc += 1; // always one step up
    } else if (b.length < s.length) { // end children
      r += '}';
      for (j=0; j<s.length - b.length; j++) {
        r += ' ]}';
      }
      r += ',\n';
      nc -= s.length - b.length; // one or more steps down
    } else {
      r += '},\n';
    }
    r += '{text:"' + b [b.length - 1] + '",' + a_attr + li_attr + '\n';
  }
  r += '}]}';
  for (i=0; i<nc; i++) {r += ' ]}';}
  r += ' ]\n';
  if (d.length === 1) {r = r.slice (0, r.length - 4);} // Surplus "} ]" characters
  return r; // Don't removeUnderscore here!
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

async function serverShell (anchor) { // Send commands in 'anchor text' to server shell
  var cmds = $ ("#"+anchor).text ();
  cmds = cmds.split ("\n");
  let commands = [];
  for (let i=0; i<cmds.length; i++) {
    if (cmds [i].length > 1 && cmds [i].slice (0, 1) !== "#") { // Skip comment lines
      commands.push (cmds [i]);
    }
  }

  //for (let i=0; i<commands.length; i++) {
    //await execute (commands [i]);
  //}

  commands = commands.join ("\n").trim ();
  if (commands) {
    var result = await mexecute (commands);
    if (result.toString ().trim ()) {
      console.log (result);
    }
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function mexecute (commands) { // Execute on the server, return a promise
  let data = new FormData ();
  data.append ("cmds", commands);
  return new Promise ( (resolve, reject) => {
    let xhr = new XMLHttpRequest ();
    xhr.open ('POST', 'mexecute/');
    xhr.onload = function () {
      resolve (xhr.responseText); // usually empty
    };
    xhr.onerror = function () {
      resolve (xhr.statusText);
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send (data);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function execute (command) { // Execute on the server, return a promise
  return new Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    command = command.replace (/%/g, "%25");
    xhr.open ('GET', 'execute/' + encodeURIComponent (command.replace (/\//g, "@")), true, null, null);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var data = xhr.responseText.trim ();
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ediTextSelWidth () { // Selects a useful edit dialog width within available screen (px)
  var sw = parseInt ( (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth)*0.95);
  if (sw > 750) {sw = 750;}
  return sw;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Prepare dialogs
var prepDialog = () => {
    $ ("#helpText").dialog ({autoOpen: false, resizable: true, title: "Användarhandledning"}); // Initiate a dialog...
    $ (".ui-dialog .ui-dialog-titlebar-close").text ("×");
    // Initiate a dialog, ready to be used:
    $ ("#dialog").dialog ({resizable: true}); // Initiate a dialog...
    $ (".ui-dialog .ui-dialog-titlebar-close").text ("×");
    $ ("#dialog").dialog ("close"); // and close it
    // Close on click off a modal dialog with overlay:
    $ ("body").on ("click", ".ui-widget-overlay", function () {
      $ ("#dialog").dialog ( "close" );
    });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Prepare the dialog for text search */
let prepSearchDialog = () => {
  $ ( () => {
    let sw = ediTextSelWidth () - 25; // Dialog width
    let tw = sw - 25; // Text width
    $ ("#searcharea").css ("width", sw + "px");
    $ ("#searcharea textarea").css ("min-width", tw + "px");
    $ ("#searcharea").dialog ( {
      title: "Finn bilder: Sök i bildtexter",
      closeText: "×",
      autoOpen: false,
      closeOnEscape: true,
      modal: false
    });
    $ ("#searcharea").dialog ('option', 'buttons', [
      {
        text: " Sök ", // findText should update
        class: "findText",
        click: function () {
          // Replace [ \n]+ with a single space
          // Replace % == NBSP with space later in the searchText function!
          let sTxt = $ ('textarea[name="searchtext"]').val ().replace (/[ \n]+/g, " ").trim ();
          if (sTxt.length < 1) {
            $ ('textarea[name="searchtext"]').val ("");
            $ ('textarea[name="searchtext"]').focus ();
          } else {
            $ ("button.updText").hide ();
            $ ("button.findText").show ();
            age_imdb_images (); // Show the time since data was collected from images
            let and = $ ('input[type="radio"]') [0].checked;
            let boxes = $ ('.srchIn input[type="checkbox"]');
            let sWhr = [];
            let n = 0;
            for (let i=0; i<boxes.length; i++) {
              // sWhr: Search where checkboxes
              sWhr [i] = boxes [i].checked;
              if (sWhr [i]) {n++}
            } // If no search alternative is checked, check at least the first
            if (!n) {
              boxes [0].checked = true;
            }
            $.spinnerWait (true, 112);
            doFindText (sTxt, and, sWhr);

          }
        }
      },
      {
        text: " Stäng ",
        click: () => {
          $ ("#searcharea").dialog ("close");
        }
      },
      {
        text: "reload", // findText should update
        title: "",
        class: "updText",
        click: function () {
          $ ("div[aria-describedby='searcharea']").hide ();
          load_imdb_images ().then ( () => {
            later ( ( () => {
              age_imdb_images ();
            }), 2000);
          });
        }
      },
    ]);
    if (!(allow.notesView || allow.adminAll)) {
      document.getElementById ("t3").parentElement.style.display = "none";
    }
    $ ("button.ui-dialog-titlebar-close").attr ("title", "Stäng"); // i18n
    $ ("div[aria-describedby='searcharea'] span.ui-dialog-title")
      .html ('Finn bilder <span style="color:green">(ej länkar)</span>: Sök i bildtexter');
  });
} // end prepSearchDialog
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Find texts in the database (file _imdb_images.sqlite) and populate
 * the #picFound album with the corresponding images (cf. prepSearchDialog)
 * @param {string} sTxt whitespace separated search text words/items
 * @param {boolean} and  true=>AND | false=>OR
 * @param {boolean} sWhr (searchWhere) array = checkboxes for selected texts
 * @param {boolean} exact when true, the LIKE searched items will not be '%' surrounded
 * NOTE: ´exact´ means "Only search for file base names!":
 * Find pictures by exact matching of image names (file basenames), e.g.
 *   doFindText ("img_0012 img_0123", false, [false, false, false, false, true], true)
 */
let doFindText = (sTxt, and, sWhr, exact) => {
  let nameOrder = [];
  searchText (sTxt, and, sWhr, exact).then (async result => {
    if (!exact) centerMarkSave = "×"; // reset ´favorites' header´
    // replace '<' and '>' for presentation in the header below
    sTxt = sTxt.replace (/</g, "&lt;").replace (/>/g, "&gt;");
    $ ("#temporary_1").text ("");
    let cmd = [];
    // Insert links of found pictures into the #picFound album:
    let n = 0, paths = [], albs = [];
    // Maximum number of pictures from the search results to show:
    let nLimit = 100;
    let filesFound = 0;
    let countAlbs = [];
    if (result) {
      paths = result.split ("\n").sort (); // Sort entries (see there below)
      let chalbs = $ ("#imdbDirs").text ().split ("\n");
      // -- Prepare counters for all albums
      let counts = "0".repeat (chalbs.length).split ("").map (Number);
      n = paths.length;
      let lpath = $ ("#imdbLink").text () + "/" + $ ("#picFound").text ();
      for (let i=0; i<n; i++) {
        let chalb = paths [i].replace (/^[^/]+(.*)\/[^/]+$/, "$1");
        let idx = chalbs.indexOf (chalb);
        if (idx > -1) {
          counts [idx]++; // -- A hit in this album
          let fname = paths [i].replace (/^.*\/([^/]+$)/, "$1");
          let linkfrom = paths [i];
          linkfrom = "../".repeat (lpath.split ("/").length - 1) + linkfrom.replace (/^[^/]*\//, "");

          // In order to show duplicates make the link names unique
          // by adding four random characters (r4) to the basename (n1)
          let n1 = fname.replace (/\.[^.]*$/, "");
          let n2 = fname.replace (/(.+)(\.[^.]*$)/, "$2");
          let r4 = Math.random().toString(36).substr(2,4);
          fname = n1 + "." + r4 + n2;
          if (filesFound < nLimit) {
            filesFound++;
            nameOrder.push (n1 + "." + r4 + ",0,0");
            let linkto = lpath + "/" + fname;
            cmd.push ("ln -sf " + linkfrom + " " + linkto);
          }
          albs.push (paths [i])
        }
      }
      for (let i=0; i<chalbs.length; i++) {
        if (counts [i]) {
          let tmp = ("     " + counts [i]).slice (-6) + "   i   " + $ ("#imdbRoot").text () + chalbs [i]
          tmp = tmp.replace (/ /g, "&nbsp;");
          countAlbs.push (tmp);
        }
      }
    }
    countAlbs.sort ();
    countAlbs.reverse ();
    paths = albs;
    n = paths.length;

    if (exact) {
      // Sort the entries according to search items if they correspond to
      // exact file base names (else keep the previous sort order) (see there above)
      let obj = [];
      filesFound = 0;
      let srchTxt = sTxt.split (" ");
      for (let i=0; i<n; i++) {
        obj [i] = ({"path": paths [i], "name": "_NA_", "cmd": cmd [i], "sortIndex": 9999});
        let pathsi = paths [i].replace (/^.*\/([^/]+)$/, "$1").replace (/\.[^./]+$/, "")
        for (let j=0; j<srchTxt.length; j++) {
          if (pathsi === srchTxt [j]) {
            obj [i] = ({"path": paths [i], "name": nameOrder [i], "cmd": cmd [i], "sortIndex": j + 1});
            filesFound++;
            break;
          }
        }
      }
      let sobj;
      if (filesFound < 3) { // Since ...?
        sobj = obj;
      } else {
        sobj = obj.sort ( (a, b) => {return a.sortIndex - b.sortIndex})
      }
      obj = null;

      paths = [];
      nameOrder = [];
      cmd = [];
      for (let i=0; i<n; i++) {
        if (i < nLimit) {
          nameOrder.push (sobj [i].name);
          cmd.push (sobj [i].cmd);
        }
        paths.push (sobj [i].path);
      }
      sobj = null;
    }

    nameOrder = nameOrder.join ("\n");
    $ ("#temporary_1").text (cmd.join ("\n"));

    if (n > 0 && n < nLimit) {
      let lpath = $ ("#imdbLink").text () + "/" + $ ("#picFound").text ();
      // Only if the picFound album is supposed to be immediately reused, regenerate
      // the picFound album: the shell commands must execute in sequence (don't split)
      await execute ("rm -rf " +lpath+ "&&mkdir -m0775 " +lpath+ "&&touch " +lpath+ "/.imdb&&chmod 664 " +lpath+ "/.imdb");
    }
    userLog (n + " FOUND");
    let txt = removeUnderscore ($ ("#picFound").text ().replace (/\.[^.]{4}$/, ""), true);
    let yes;
    later ( ( () => {
      yes ="Visa i <b>" + txt + "</b>";
    }), 40);
    let modal = false;
    let p3 =  "<p style='margin:-0.3em 1.6em 0.2em 0;background:transparent'>" + sTxt + "</p>Funna i <span style='font-weight:bold'>" + $ ("#imdbRoot").text () + "</span>:&nbsp; " + n + (n>nLimit?" (bara " + nLimit + " kan visas)":"");
    later ( ( () => {

      let imdbx = new RegExp ($ ("#imdbLink").text () + "/", "g");

      // Run `serverShell ("temporary_1")` -> symlink creation, via `infoDia (null, "", ...
      infoDia (null, "", p3, "<div style='text-align:left;margin:0.3em 0 0 2em'>" + paths.join ("<br>").replace (imdbx, "./") + "</div>", yes, modal);

      later ( ( () => {
        // In this section the hidden ´go back to previous album´ button is located
        // and clicked, indirectly. The key global varaible is ´returnTitles´ (search it!).
        if (n === 0) {
          document.getElementById("yesBut").disabled = true;
          if (exact) {
            //let btFind ="<br><button style=\"border:solid 2px white;background:#b0c4deaa;\" onclick='$(\"#dialog\").dialog(\"close\");$(\"div.subAlbum[title=" + returnTitles [2] + "]\")[0].click();$(\"#favorites\").click();'>TILLBAKA</button>";
            let btFind ="<br><button style=\"border:solid 2px white;background:#b0c4deaa;\" onclick='$(\"#dialog\").dialog(\"close\");$(\"#favorites\").click();'>TILLBAKA</button>";
            document.getElementById("dialog").innerHTML = btFind;
            $("#dialog button") [0].focus();
          } else {
            //let btFind ="<br><button style=\"border:solid 2px white;background:#b0c4deaa;\" onclick='$(\"#dialog\").dialog(\"close\");$(\"div.subAlbum[title=" + returnTitles [2] + "]\")[0].click();$(\"a.search\").click();'>TILLBAKA</button>";
            let btFind ="<br><button style=\"border:solid 2px white;background:#b0c4deaa;\" onclick='$(\"#dialog\").dialog(\"close\");$(\"a.search\").click();'>TILLBAKA</button>";
            document.getElementById("dialog").innerHTML = btFind;
            $("#dialog button") [0].focus();
          }
        } else if (n > nLimit) {
          document.getElementById("yesBut").disabled = true;
          //let btFind = "<div style=\"text-align:left\"> Fann:<br>" + countAlbs.join ("<br>") + "</div><br><button style=\"border:solid 2px white;background:#b0c4deaa;\" onclick='$(\"#dialog\").dialog(\"close\");$(\"div.subAlbum[title=" + returnTitles [2] + "]\")[0].click();$(\"a.search\").click();'>TILLBAKA</button>";
          let btFind = "<div style=\"text-align:left\"> Fann:<br>" + countAlbs.join ("<br>") + "</div><br><button style=\"border:solid 2px white;background:#b0c4deaa;\" onclick='$(\"#dialog\").dialog(\"close\");$(\"a.search\").click();'>TILLBAKA</button>";
          document.getElementById("dialog").innerHTML = btFind;
          $("#dialog button") [0].focus();
        }
      }), 40);
      $ ("button.findText").show ();
      $ ("button.updText").css ("float", "right");

      $ ("div[aria-describedby='searcharea']").hide ();
      if (n > 0 && n < nLimit) displayPicFound ();
      else $.spinnerWait (false, 111);

      let noDisplay = n && n <= nLimit && (loginStatus === "guest" || loginStatus === "viewer" || !loggedIn);
      if (noDisplay) $ ("div[aria-describedby='dialog']").hide ();
      // Save 'nameOrder' as the picFound album's namelist:
      later ( ( () => {
        saveOrderFunc (nameOrder.trim ()).then ( () => {
          if (noDisplay) { // then show the search result at once
            $ ("div[aria-describedby='dialog']").hide ();
            later ( ( () => {
              $ ("div[aria-describedby='dialog'] button#yesBut").trigger ("click");
            }), 200);
          } // ...else inspect and decide whether to click the show button
        });
      }), 600);
    }), 2000);
  });
} // End doFindText
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Locate the found-pictures album link in jstree, and display the album
function displayPicFound () {
  let idx = $ ("#imdbDirs").text ().split ("\n").indexOf ("/" + $ ("#picFound").text ());
  selectJstreeNode (idx);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Search the image texts in the current imdbRoot (cf. prepSearchDialog)
 * @param {string} searchString space separated search items
 * @param {boolean} and true=>AND | false=>OR
 * @param {boolean} searchWhere array, checkboxes for selected texts
 * @param {boolean} exact true will remove SQL ´%´s
 * @returns {string} \n-separated file paths
 */
function searchText (searchString, and, searchWhere, exact) {
  hideShow_g ();
  ediTextClosed ();
  let ao = "", AO;
  if (and) {AO = " AND "} else {AO = " OR "}
  let arr = searchString;
  if (arr === "") {arr = undefined;}
  let str = "";
  if (arr) {
    arr = arr.split (" ");
    for (let i = 0; i<arr.length; i++) {
      // Replace any `'` with `''`, will be enclosed with `'`s in SQL
      arr[i] = arr [i].replace (/'/g, "''") + "";
      // Replace underscore to be taken literally, needs `ESCAPE '\'`
      arr[i] = arr [i].replace (/_/g, "\\_") + "";
      // First replace % (thus, NBSP):
      arr[i] = arr [i].replace (/%/g, " ");
      // Then use % the SQL way if applicable, and add `ESCAPE '\'`:
      if (exact) { // Exact match for file (base) names favorites search
        arr [i] = "'" + arr [i] + "' ESCAPE '\\'";
      } else {
        arr [i] = "'%" + arr [i] + "%' ESCAPE '\\'";
      }
      if (i > 0) {ao = AO + "\n"}
      str += ao + "txtstr LIKE " + arr[i].trim ();
    }
    str = str.replace (/\n/g, "");
  }
  if (!$ ("#imdbDir").text ()) {
    $ ("#imdbDir").text ($ ("#imdbLink").text () + "/" + $ ("#picFound").text ());
  }
  let srchData = new FormData ();
  srchData.append ("like", str);
  srchData.append ("cols", searchWhere);
  srchData.append ("info", "not used yet");
  return new Promise ( (resolve, reject) => {
    let xhr = new XMLHttpRequest();
    let imdbroot = $ ("#imdbRoot").text ();
    xhr.open ('POST', 'search/' + imdbroot);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        let data = xhr.responseText.trim ();
        //data.sort
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.send (srchData);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// https://stackoverflow.com/questions/30605298/jquery-dialog-with-input-textbox etc.
// Prepare the dialog for the image texts editor
var prepTextEditDialog = () => {
  var sw = ediTextSelWidth (); // Selected dialog width
  var tw = sw - 25; // Text width
  $ ("#textareas").dialog ({
    title: "Bildtexter",
    closeText: "×", // Set title below
    autoOpen: false,
    draggable: true,
    closeOnEscape: false, // NOTE: handled otherwise
    modal: false
  });
  $ ("#textareas").css ("width", sw + "px");
  $ ('textarea[name="description"]').css ("min-width", tw + "px");
  $ ('textarea[name="creator"]').css ("min-width", tw + "px");
  $ ("#textareas").dialog ('option', 'buttons', [
    {
      text: "Anteckningar",
      class: "notes",
      click: () => { // 'Non-trivial' dialog button, to the 'notes' new level
        var namepic = $ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
        var ednp = escapeDots (namepic);
        var linkPath = $ ("#i" + ednp + " img").attr ("title");
        linkPath = $ ("#imdbLink").text () + "/" + linkPath;
        var filePath = linkPath; // OK if not a link
        function xmpGetSource () {
          execute ("xmpget source " + filePath).then (result => {
            notesDia (namepic, filePath, "Anteckningar till ", result, "Spara", "Spara och stäng", "Stäng");
          });
        }
        if ($ ("#i" + ednp).hasClass ("symlink")) {
          getFilestat (linkPath).then (result => {
            //console.log (result); // The file info HTML, strip it:
            result = result.replace (/^.+: ((\.){1,2}\/)+/, $ ("#imdbLink").text () + "/");
            result = result.replace (/^([^<]+)<.+/, "$1");
            filePath = result;
          }).then ( () => {
            xmpGetSource ();
            return;
          })
        } else {
          xmpGetSource ();
        }
      }
    },
    {
      text: " Spara ",
      class: "saveTexts block",
      click: function () {
        var namepic = $ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
        var text1 = $ ('textarea[name="description"]').val ();
        var text2 = $ ('textarea[name="creator"]').val ();
        storeText (namepic, text1, text2);
      }
    },
    {
      text: " Spara och stäng ",
      class: "saveTexts block",
      click: () => {
        var namepic = $ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
        var text1 = $ ('textarea[name="description"]').val ();
        var text2 = $ ('textarea[name="creator"]').val ();
        storeText (namepic, text1, text2);
        ediTextClosed ();
      }
    },
    {
      text: " Stäng ",
      class: "block",
      click: () => {
        ediTextClosed ();
      }
    },
    {
      text: "Nyckelord",
      class: "keys",
      click: () => { // "Non-trivial" dialog button, to a new level
        infoDia (null, "","Nyckelord", "Ord lagrade som metadata<br>som kan användas som särskilda sökbegrepp:<br><br>Planerat framtida tillägg", "Ok", true);
      }
    }
  ]);
  // Set close title:
  $ ("div.ui-dialog-titlebar button.ui-dialog-titlebar-close").attr ("title", "Stäng"); // i18n
  // Set close action ...
  // NOTE this clumpsy direct reference to jquery (how directly trigger ediTextClosed?):
  $ ("div.ui-dialog-titlebar button.ui-dialog-titlebar-close").attr ("onclick",'$("div[aria-describedby=\'textareas\'] span.ui-dialog-title span").html("");$("div[aria-describedby=\'textareas\']").hide();$("#navKeys").text("true");$("#smallButtons").show();');

  $ ("button.block").wrapAll ('<div id="glued" style="display:inline-block;white-space:nowrap;"></div>');
  function storeText (namepic, text1, text2) {
    text1 = text1.replace (/  */g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    text2 = text2.replace (/  */g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    // Show what was saved:
    $ ('textarea[name="description"]').val (text1.replace (/<br>/g, "\n"));
    $ ('textarea[name="creator"]').val (text2.replace (/<br>/g, "\n"));
    var ednp = escapeDots (namepic);
    var fileName = $ ("#i" + ednp + " img").attr ("title");
    fileName = $ ("#imdbLink").text () + "/" + fileName;
    $ ("#i" + ednp + " .img_txt1" ).html (text1);
    $ ("#i" + ednp + " .img_txt1" ).attr ("title", text1.replace(/<[^>]+>/gm, " "));
    $ ("#i" + ednp + " .img_txt1" ).attr ("totip", text1.replace(/<[^>]+>/gm, " "));
    $ ("#i" + ednp + " .img_txt2" ).html (text2);
    $ ("#i" + ednp + " .img_txt2" ).attr ("title", text2.replace(/<[^>]+>/gm, " "));
    $ ("#i" + ednp + " .img_txt2" ).attr ("totip", text2.replace(/<[^>]+>/gm, " "));
    if ($ (".img_show .img_name").text () === namepic) {
      $ ("#wrap_show .img_txt1").html (text1);
      //document.querySelector ("#wrap_show .img_txt1").innerHTML = text1;
      $ ("#wrap_show .img_txt2").html (text2);
    }
    // Cannot save metadata in GIFs:
    if (fileName.search (/\.gif$/i) > 0) return;
    // Get real file name if symlink:
    let linkPath = fileName;
    if ($ ("#i" + ednp).hasClass ("symlink")) {
      getFilestat (linkPath).then (result => {
        //console.log (result); // The file info HTML, strip it:
        result = result.replace (/^.+: ((\.){1,2}\/)+/, $ ("#imdbLink").text () + "/");
        result = result.replace (/^([^<]+)<.+/, "$1");
        fileName = result;
      }).then ( () => {
        saveText (fileName +'\n'+ text1 +'\n'+ text2);
        return;
      })
    } else {
      saveText (fileName +'\n'+ text1 +'\n'+ text2);
    }
    // ===== XMLHttpRequest saving the text
    function saveText (txt) {
      var IMDB_DIR =  $ ("#imdbDir").text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";} // Important!
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories

      var xhr = new XMLHttpRequest ();
      xhr.open ('POST', 'savetext/' + IMDB_DIR); // URL matches server-side routes.js
      xhr.onload = function () {
        if (xhr.responseText) {
          userLog ("NOT written");
          $ ("#i" + ednp + " .img_txt1" ).html ("");
          $ ("#i" + ednp + " .img_txt2" ).html ("");
          infoDia (null, null,"Texten sparades inte!", '<br>Bildtexten kan inte uppdateras på grund av<br>något åtkomsthinder &ndash; är filen ändringsskyddad?<br><br>Eventuell tillfälligt förlorad text återfås med ”Ladda om albumet (återställ osparade ändringar)”', "Ok", true);
        } else {
          userLog ("TEXT written", false, 2000);
          //console.log ('Xmp.dc metadata saved in ' + fileName);
        }
      }
      xhr.send (txt);
    }
  }
} // end prepTextEditDialog
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Refresh the editor dialog content
function refreshEditor (namepic, origpic) {
  $ ("div[aria-describedby='textareas'] span.ui-dialog-title").html ("Bildtexter till <span class='blue'>" + namepic + "</span>");
  // Take care of the notes etc. buttons:
  if (!(allow.notesView || allow.adminAll)) {

    document.querySelector ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.notes").disabled = true;
    //$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.notes").css ("display", "none");
    $ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.keys").css ("display", "none");
  } else {
    document.querySelector ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.notes").disabled = false;
    //$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.notes").css ("display", "inline");
    $ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button.keys").css ("display", "inline");
  }
  $ ("#textareas .edWarn").html ("");
  let warnText = "";
  if ($ ("button.saveTexts").attr ("disabled")) { // Cannot save if not allowed
    warnText += nosObs;
    //$ ("#textareas .edWarn").html (nosObs); // Nos = no save
  }
  if (origpic.search (/\.gif$/i) > 0) {
    // Don't display the notes etc. buttons:
    warnText += (warnText?"<br>":"") + nopsGif;
    $ (".ui-dialog-buttonset button.notes").css ("display", "none");
    $ (".ui-dialog-buttonset button.keys").css ("display", "none");
  }
  warnText = "<b style='float:left;cursor:text'> &nbsp; ’ – × ° — ” &nbsp; </b>" + warnText;

  if (warnText) {$ ("#textareas .edWarn").html (warnText);}
  // Load the texts to be edited after positioning to top
  $ ('textarea[name="description"]').html ("");
  $ ('textarea[name="creator"]').html ("");
  $ ("#textareas").dialog ("open"); // Reopen
  $ ('textarea[name="description"]').focus ();
  later ( ( () => {
    $ ('textarea[name="creator"]').val ($ ('#i' + escapeDots (namepic) + ' .img_txt2').html ().trim ().replace (/<br>/g, "\n"));
    $ ('textarea[name="description"]').val ($ ('#i' + escapeDots (namepic) + ' .img_txt1').html ().trim ().replace (/<br>/g, "\n"));
  }), 80);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var allowance = [ // 'allow' order
  "adminAll",     // + allow EVERYTHING
  "albumEdit",    // +  " create/delete album directories
  "appendixEdit", // o  " edit appendices (attached documents)
  "appendixView", // o  " view     "
  "delcreLink",   // +  " delete and create linked images NOTE *
  "deleteImg",    // +  " delete (= remove, erase) images NOTE *
  "imgEdit",      // o  " edit images
  "imgHidden",    // +  " view and manage hidden images
  "imgOriginal",  // +  " view and download full size images
  "imgReorder",   // +  " reorder images
  "imgUpload",    // +  " upload    "
  "notesEdit",    // +  " edit notes (metadata) NOTE *
  "notesView",    // +  " view   "              NOTE *
  "saveChanges",  // +  " save order/changes (= saveOrder)
  "setSetting",   // +  " change settings
  "textEdit"      // +  " edit image texts (metadata)
];
var allowSV = [ // Ordered as 'allow', IMPORTANT!
  "Får göra vadsomhelst",
  "göra/radera album",
  "(arbeta med bilagor +4)",
  "(se bilagor)",
  "flytta till annat album, göra/radera länkar",
  "radera bilder +5",
  "(redigera bilder)",
  "gömma/visa bilder",
  "se högupplösta bilder",
  "flytta om bilder inom album",
  "ladda upp originalbilder till album",
  "redigera/spara anteckningar +13",
  "se anteckningar",
  "spara ändringar utöver text",
  "ändra inställningar",
  "redigera/spara bildtexter, gömda album"
];
var allowvalue = "0".repeat (allowance.length);
$ ("#allowValue").text (allowvalue);
/** Allowances settings, global variables:
 *  @allowance contains the property names array for 'allow'
 *  @allowvalue is the source of the 'allow' property values
 *  @allow carries 0|1 settings like 'allow.deleteImg' etc.
 */
var allow = {};
function zeroSet () { // Called from logIn at logout
  $ ("#allowValue").text ("0".repeat (allowance.length));
}
function allowFunc () { // Called from setAllow (which is called from init(), logIn(), toggleSettings(),..)
  allowvalue = $ ("#allowValue").text ();
  for (var i=0; i<allowance.length; i++) {
    allow [allowance [i]] = Number (allowvalue [i]);
    //console.log(allowance[i], allow [allowance [i]]);
  }
  if (allow.deleteImg) {  // NOTE *  If ...
    allow.delcreLink = 1; // NOTE *  then set this too
    i = allowance.indexOf ("delcreLink");
    allowvalue = allowvalue.slice (0, i - allowvalue.length) + "1" + allowvalue.slice (i + 1 - allowvalue.length); // Also set the source value (in this way since see below)
    //allowvalue [i] = "1"; Gives a weird compiler error: "4 is read-only" if 4 = the index value
  }
  if (allow.notesEdit) { // NOTE *  If ...
    allow.notesView = 1; // NOTE *  then set this too
    i = allowance.indexOf ("notesView");
    allowvalue = allowvalue.slice (0, i - allowvalue.length) + "1" + allowvalue.slice (i + 1 - allowvalue.length);
  }
  // Hide smallbuttons we don't need:
  if (allow.adminAll || allow.saveChanges) {
    $ ("#saveOrder").show ();
  } else {
    $ ("#saveOrder").hide (); // Any user may reorder but not save it
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function subaSelect (subName, path) { // ##### Sub-album link selected
  subName = subName.replace (/&nbsp;/g, "_"); // Restore readable album name
  // NOTE: That restoring may be questionable with " " instead of "&nbsp;"
  $.spinnerWait (true, 113);
  let names = $ ("#imdbDirs").text ().split ("\n");
  let name = $ ("#imdbDir").text ().slice ($ ("#imdbLink").text ().length); // Remove imdbLink
  let here, idx;
  if (path) { // subName has full path except that '..' and similar is removed
    idx = names.indexOf (subName);
  } else if (subName === "⌂hem") { // go to top in tree = home
    idx = 0;
  } else if (subName === "↖") { // go up in tree
    name = name.replace (/((\/[^/])*)(\/[^/]*$)/, "$1");
    idx = names.indexOf (name);
  } else if (subName === "⇆") { // go to most recent (by browser navigation)
    idx = savedAlbumIndex;
  } else {
    here = names.indexOf (name);
    idx = names.slice (here + 1).indexOf (name + "/" + subName);
    if (idx < 0) {
      $ (".mainMenu").hide ();
    } else {
      idx = idx + here + 1;
    }
  }
  if (idx < 0) {
    $ (".mainMenu").hide ();
    return;
  } else {
    // NOTE: jstree uses (calls) selectAlbum (see the HBS file)
    // NOTE!
    selectJstreeNode (idx);
    // NOTE!
    // NOTE: jstree uses (calls) selectAlbum (see the HBS file)
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Disable browser back button
window.history.pushState (null, "");
window.onpopstate = function () {
  subaSelect ("⇆");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function showFileInfo () {
  var picName = $ ("#picName").text ();
  var picOrig = $ ("#picOrig").text ();
  var title = "Information";
  var yes = "Ok";
  getFilestat (picOrig).then (result => {
    $ ("#temporary").text (result);
  }).then ( () => {
    if ($ ("#imdbDir").text ().indexOf (picFound) > -1) picName = picName.replace (/^(.+)\.[^.]+$/, "$1");
    var txt = '<i>Namn</i>: <span style="color:black">' + picName + '</span><br>';
    txt += $ ("#temporary").text ();
    var tmp = $ ("#download").attr ("href");
    if (tmp && tmp.toString () != "null") {
      txt += '<br><span class="lastDownload"><i>Senast startad nedladdning</i>:<br>' + tmp + "</span>";
    }
    infoDia (null, picName, title, txt, yes, false);
    $ ("#temporary").text ("");
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function emailOk(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Open an album, in the current JStree album tree, by its zero origin index
 *  @param {number} idx The index of the album in the JStree catalog tree
 */
function selectJstreeNode (idx) {
  $ (".ember-view.jstree").jstree ("close_all");
  $ (".ember-view.jstree").jstree ("_open_to", "#j1_" + (1 + idx));
  $ (".ember-view.jstree").jstree ("deselect_all");
  $ (".ember-view.jstree").jstree ("select_node", $ ("#j1_" + (1 + idx))); // calls selectAlbum
  $ (".ember-view.jstree").jstree ("open_node", $ ("#j1_1"));
}
window.selectJstreeNode = function (idx) { // for child window (iframe)
  selectJstreeNode (idx);
}
