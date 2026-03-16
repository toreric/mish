//== Mish image (thumbnail) menu, replaces former context menu

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { Spinner } from './spinner';
import { MenuMain } from './menu-main';

import { TrackedArray } from 'tracked-built-ins';

import { dialogAlertId } from './dialog-alert';
import { dialogChooseId } from './dialog-choose';
import { dialogInfoId } from './dialog-info';
import { dialogTextId } from './dialog-text';

const LF = '\n';   // Line Feed == New Line
const BR = '<br>'; // HTML line break
const SP = '&nbsp;'; // single space
const SP2 = '&nbsp;&nbsp;'; // double space
const SP4 = '&nbsp;&nbsp;&nbsp;&nbsp;'; // four spaces

// Get the thumbnail-containing elements to be operated on,
// either one unselected, or all co-selected elements:
const selMinImgs = (picName) => {
  //close view image (and nav-links) if open:
  if (!document.querySelector('div.nav_links').style.display) {
    document.getElementById('go_back').click();
  }
  if (document.getElementById('i' + picName).classList.contains('selected'))
    return document.querySelectorAll('.img_mini.selected');
  // If only this unselected image, get an array of a single element:
  // Don't forget escapeDots (see common-storage.js)
  else return document.querySelectorAll('#i' + picName.replace(/\./g, '\\.'));
}

// NOTE: MenuImage is the menu OF an image!
export class MenuImage extends Component {
  @service('common-storage') z;
  @service intl;

 // Detect closing Esc key
  detectClose = (e) => {
    e.stopPropagation();
    // Detect Esc key, or mouse click in the uppermost × line of this menu:
    if (e.type === 'keydown' && e.keyCode === 27 || e.type === 'click') {
      // Close any open image menu (still if probably one single is open):
      for (let list of document.querySelectorAll('.menu_img_list')) list.style.display = 'none';
      // Sorry, no loli message!
    }
    document.querySelector('body').focus();
  }

  // A single image sometimes doesn't have this choice
  get chooseText() {
    if (this.z.numMarked === 1) {
      return this.intl.t('write.chooseOne');
    } else if (this.z.numMarked === 2) {
      return this.intl.t('write.chooseBoth');
    } else {
      return this.intl.t('write.chooseMany', {n: this.z.numMarked});
    }
  }

  get chooseHide() {
    return this.intl.t('write.chooseHide');
  }

  get chooseFirst() {
    return this.intl.t('write.chooseFirst');
  }

  get chooseLast() {
    return this.intl.t('write.chooseLast');
  }

  get chooseLink() {
    return this.intl.t('write.chooseLink');
  }

  get chooseMove() {
    return this.intl.t('write.chooseMove');
  }

  get chooseErase() {
    return this.intl.t('write.chooseErase');
  }

  // Hide or show one, or some checked, thumbnail images
  hideShow = async () => {
    let imgs = selMinImgs(this.z.picName);

    // begin local function ---------
    const perform = async () => {
      for (let pic of imgs) {
        if (pic.classList.contains('hidden')) {
          await new Promise (z => setTimeout (z, 29)); // hideShow 1
          pic.classList.remove('hidden');
          pic.classList.remove('invisible');
        } else {
          pic.classList.add('hidden');
          if (this.z.ifHideSet()) pic.classList.add('invisible');
        }
      }
    }// end local function -----------

    this.z.toggleMenuImg(0); //close image menu
    if (imgs.length > 1) {
      this.z.chooseText = this.chooseText + '<br>' + this.chooseHide;
      this.z.infoHeader = this.intl.t('write.chooseHeader');
      this.z.buttonNumber = 0;
      await new Promise (z => setTimeout (z, 99)); // hideShow 2
      this.z.openModalDialog(dialogChooseId);
      while (!this.z.buttonNumber) {
        await new Promise (z => setTimeout (z, 199)); // hideShow 3
        if (this.z.buttonNumber === 1) { await perform(); } // first button confirms
      } // if another button leave and close
    } else { await perform(); } // a single img needs no confirmation
    this.z.countNumbers();
    this.z.closeDialogs();
    this.z.sortOrder = this.z.updateOrder();
  }

  // Mark (check as selected) only hidden images
  markHidden = () => {
    if (!document.querySelector('div.nav_links').style.display) {
      document.getElementById('go_back').click();
    }
    for (let pic of document.querySelectorAll('.img_mini')) {
      if (pic.classList.contains('hidden')) {
        pic.classList.add('selected');
        pic.querySelector('div[alt="MARKER"]').className = 'markTrue';
      } else {
        pic.classList.remove('selected');
        pic.querySelector('div[alt="MARKER"]').className = 'markFalse';
      }
    }
    this.z.countNumbers();
    this.z.toggleMenuImg(0); //close image menu
    this.z.sortOrder = this.z.updateOrder();
  }

  // Check or uncheck all thumbnail images (check = mark as selected)
  checkUncheck = () => {
    //close view image (and nav-links) if open (not 'display:none'):
    if (!document.querySelector('div.nav_links').style.display) {
      document.getElementById('go_back').click();
    }
    if (document.getElementById('i' + this.z.picName).classList.contains('selected')) {
      let pics =  document.querySelectorAll('.img_mini.selected');
      for (let pic of pics) {
        pic.classList.remove('selected');
        pic.querySelector('div[alt="MARKER"]').className = 'markFalse';
      }
    } else {
      let pics = document.querySelectorAll('.img_mini');
      for (let pic of pics) {
        pic.classList.add('selected');
        pic.querySelector('div[alt="MARKER"]').className = 'markTrue';
      }
    }
    this.z.countNumbers();
    this.z.sortOrder = this.z.updateOrder();
  }

  // Invert selections (marked/checked)
  invertSelection = () => {
    if (!document.querySelector('div.nav_links').style.display) {
      document.getElementById('go_back').click();
    }
    for (let pic of document.querySelectorAll('.img_mini')) {
      if (pic.classList.contains('selected')) {
        pic.classList.remove('selected');
        pic.querySelector('div[alt="MARKER"]').className = 'markFalse';
      } else {
        pic.classList.add('selected');
        pic.querySelector('div[alt="MARKER"]').className = 'markTrue';
      }
    }
    this.z.countNumbers();
    this.z.sortOrder = this.z.updateOrder();
  }

  // Move (within the screen) one, or some checked, thumbnail image(s),
  // if (isTrue === true): to the beginning, placeFirst
  // if (isTrue === false):  to   the   end, placeLast
  placeFirst = async (isTrue) => { // NOTE: 'placeLast()' is 'placeFirst(false)'!

    // begin local function ---------
    const perform = async () => {
      await new Promise (z => setTimeout (z, 99)); // placeFirst1
      // When you add an element that is already in the DOM,
      // this element will be moved, not copied.
      for (let pic of imgs) {
        if (isTrue) parent.insertBefore(pic, parent.firstChild);
        else parent.appendChild(pic);
      }
      this.z.closeDialogs();
      this.z.toggleMenuImg(0); //close image menu
    }// end local function ----------

    var parent = document.getElementById('imgWrapper');
    let imgs = selMinImgs(this.z.picName);
    let addline;

    if (imgs.length > 1) {
      if (isTrue) addline = this.chooseFirst;
      else addline = this.chooseLast;
      this.z.chooseText = this.chooseText + '<br>' + addline;
      this.z.infoHeader = this.intl.t('write.chooseHeader');
      this.z.buttonNumber = 0;
      await new Promise (z => setTimeout (z, 99)); // placeFirst2
      this.z.openModalDialog(dialogChooseId);
      while (!this.z.buttonNumber) {
        await new Promise (z => setTimeout (z, 199)); // placeFirst3
        if (this.z.buttonNumber === 1) { // first button confirms
          await perform();
          this.z.toggleMenuImg(0); //close image menu
          this.z.alertMess(this.z.intl.t('write.afterSort')); // TEMPORARY
        }
        // if another button leave and close
      }
    } else { // a single img needs no confirmation
      await perform();
      this.z.toggleMenuImg(0); //close image menu
      this.z.alertMess(this.z.intl.t('write.afterSort')); // TEMPORARY
    }
    this.z.closeDialog(dialogChooseId);
    this.z.countNumbers();
    this.z.sortOrder = this.z.updateOrder();
  }

  downLoad = async () => {
    // var that = this;
    var path = this.z.imdbPath + this.z.allFiles[this.z.picIndex].linkto;
      // this.z.loli('DOWNLOAD ' + path, 'color:red');
    var fileName = path.replace(/^\/(.*\/)*/, '');
      // this.z.loli(fileName, 'color:red');
      // this.z.loli(!fileName.search(/^vbm|^cpr/i), 'color:red');
      // this.z.loli(this.z.allow.deleteImg, 'color:red');
    // If the file name begins with e.g. 'Vbm' or 'CPR'
    // then !fileName.search(/^vbm|^cpr/i) is !0 === true:
    if (!fileName.search(/^vbm|^cpr/i) && !this.z.allow.deleteImg) {
      this.z.alertMess(this.intl.t('blockCopyright1'));
      return;
    }
      // var urletal = this.z.allFiles[this.z.picIndex]; //debug
      // console.log(urletal);
    let file = await fetch(path).then(r => r.blob()).then(blobFile => new File([blobFile],  fileName, { type: blobFile.type, lastModified: blobFile.lastModified }));
      // console.log(file);
    let imDnLd;
    imDnLd = document.createElement('a');
    imDnLd.href = URL.createObjectURL(file);
    // imDnLd.href = 'https://google.com';
    imDnLd.download = fileName;
      console.log(imDnLd);
    imDnLd.click();
    imDnLd.remove();
    URL.revokeObjectURL(file);
  }

  get albname() {
    let a = '';
    let i = this.z.picIndex;
    if (i < 0) return a; //important
    let b = this.z.allFiles[i];
    if (b) a = b.albname; //name of home album
    return a;
  }
  get orig() {
    let a = '';
    let i = this.z.picIndex;
    if (i < 0) return a; //important
    let b = this.z.allFiles[i];
    if (b) a = b.orig; //path to home album
    return a;
  }
  get symlink() {
    let a = '';
    let i = this.z.picIndex;
    if (i < 0) return a; //important
    let b = this.z.allFiles[i];
    if (b) a = b.symlink; //has a home album
    return a;
  }

  get notSymlink() {
    return !this.symlink;
  }

  // Link (into another album within the collection)
  // a single image, or a number of checked images.
  linkFunc = async () => {
    let imgs = selMinImgs(this.z.picName);
    await new Promise (z => setTimeout (z, 29)); // linkFunc1
    let sym = false;
    for (let img of imgs) {
      if (img.classList.contains('symlink')) sym = true;
    }
    if (sym) {
      this.z.alertMess(this.intl.t('write.noLinkLink'));
      return;
    }
    this.z.toggleMenuImg(0); //close image menu
    if (imgs.length > 1) {
      this.z.chooseText = this.chooseText + '<br>' + this.chooseLink;
      this.z.infoHeader = this.intl.t('write.chooseHeader');
      this.z.buttonNumber = 0;
      // this.z.buttonNumber is set with this.z.selectChoice
      // to 1 or 2 when a DialogChoose button is clicked:
      await new Promise (z => setTimeout (z, 29)); // linkFunc2
      this.z.openModalDialog(dialogChooseId);
      while (!this.z.buttonNumber) {
        await new Promise (z => setTimeout (z, 29)); // linkFunc3
        if (this.z.buttonNumber === 1) { // 1 confirms
          this.z.closeDialog(dialogChooseId);
          this.z.chooseText = this.intl.t('button.linkFunc');
          this.z.openModalDialog('chooseAlbum'); // 1 confirms
        }
      } // if another button: leave and close
    } else {
      // a single img needs no confirmation but we border-mark it
      this.z.markBorders(this.z.picName);
      this.z.chooseText = this.intl.t('button.linkFunc');
      this.z.openModalDialog('chooseAlbum');
      // The outcome is processed in chooseAlbum, see closeChooseAlbum
    }
    this.z.closeDialog(dialogChooseId);
    return;
  }

  // Move (to another album within the collection)
  // a single image, or a number of checked images.
  moveFunc = async () => {
    let imgs = selMinImgs(this.z.picName);
    await new Promise (z => setTimeout (z, 29)); // moveFunc 1
    this.z.toggleMenuImg(0); //close image menu
    if (imgs.length > 1) {
      this.z.chooseText = this.chooseText + '<br>' + this.chooseMove;
      this.z.infoHeader = this.intl.t('write.chooseHeader');
      this.z.buttonNumber = 0;
      // this.z.buttonNumber is set with this.z.selectChoice
      // to 1 or 2 when a DialogChoose button is clicked:
      await new Promise (z => setTimeout (z, 29)); // moveFunc 2
      this.z.openModalDialog(dialogChooseId);
      while (!this.z.buttonNumber) {
        await new Promise (z => setTimeout (z, 29)); // moveFunc 3
        if (this.z.buttonNumber === 1) {
          this.z.chooseText = this.intl.t('button.moveFunc');
          this.z.closeDialog(dialogChooseId);
          this.z.openModalDialog('chooseAlbum'); // 1 confirms
        }
      } // if another button leave and close
    } else {
      // a single img needs no confirmation but we border-mark it
      this.z.chooseText = this.intl.t('button.moveFunc');
      this.z.markBorders(this.z.picName);
      this.z.openModalDialog('chooseAlbum');
      // The outcome is processed in chooseAlbum, see closeChooseAlbum
    }
    this.z.closeDialog(dialogChooseId);
    return;
  }

  // Deletes a single checked, or a number of checked images. If ALL are symlinks
  // and a certain checkbox is checked, the files LINKED FROM are ALSO DELETED,
  // which may be convenient for caefully cleaning out duplicates.
  eraseFunc = async () => {
    let fromIndex = this.z.imdbDirIndex;
      // this.z.loli(this.z.picName, 'color:red');
    let imgs = selMinImgs(this.z.picName);
    await new Promise (z => setTimeout (z, 29)); // eraseFunc 1
    this.z.toggleMenuImg(0); //close image menu
    if (document.getElementById('i' + this.z.picName).classList.contains('selected')) {
      // From toggleDisplayNames in ButtonsLeft:
      this.z.displayNames = 'block'; // Display image names
      this.z.infoHeader = this.intl.t('write.chooseHeader');
      // this.z.chooseText = '<span style="color:#df1837">'
      this.z.chooseText = '<span style="color:black">'
      let test = document.querySelectorAll('.img_mini.selected.symlink');
      let iflink = test.length > 0; //are there any symlinks?
      // Begin with this warning (it concerns all selected):
      this.z.chooseText += '<b>' + this.intl.t('write.eraseFunc') + '</b>';
      if (iflink) {
        this.z.chooseText += this.intl.t('write.eraseFunc1');
      }
      this.z.chooseText += '<br><br><b style="color:#df1837">';
      // State the number to erase:
      if (imgs.length > 1) {
        this.z.chooseText += this.intl.t('write.imageSeveral', {n: imgs.length});
      } else {
        this.z.chooseText += this.intl.t('write.imageSingle');
      }
      this.z.chooseText += '</b>:</span><br><br>';
      this.z.chooseText += '<span style="font-weight:bold">';

      for (let pic of imgs) {
        if (pic.classList.contains('symlink')) {
          this.z.chooseText += '<span style="color:#080">'; //green
        }
        else this.z.chooseText += '<span style="color:#000">'; //black
        this.z.chooseText += pic.querySelector('.img_name').innerText.trim() + '</span>, ';
      }
      this.z.chooseText = this.z.chooseText.slice(0, -2); // Remove last ', '
      this.z.chooseText += '</span>'

      if (iflink) { // if some symlink: explain further
        this.z.chooseText += '<br><br><span style="font-weight:normal;color:#080">';
        this.z.chooseText += this.intl.t('write.originUntouch') + '</span>';
        // Prepare the dialogChoose Choice_3 appearance:
        document.querySelector('span.Choice_3 label').innerHTML = SP2 + ' ' + this.intl.t('write.eraseOption');
      }

      this.z.openModalDialog(dialogChooseId);
      // When all images are symlinks, Choice_3 is displayed: (*)
      if (imgs.length === test.length) {
        // Here Choice_3 means the OPTION 'erase even originals':
        document.querySelector('span.Choice_3').style.display = 'flex';
        // document.querySelector('span.Choice_3').style.color = '#df1837';
      }

      // this.z.buttonNumber is set with this.z.selectChoice
      // to 1, 2, or 3 when a DialogChoose button is clicked:
      this.z.buttonNumber = 0;
      // Wait until nonzero buttonNumber:
      while (!this.z.buttonNumber) {
        await new Promise (z => setTimeout (z, 199)); // eraseFunc 2
      }

      // (*) Concerning the use of dialogChoose here:
      // IF BUTTON 3 (ACTUALLY A CHECKBOX) IS VISIBLE, ALL IMAGES ARE SYMLINKS.
      // Then, if checked, EVEN THE ORIGINALS, which are linked
      // to, WILL BE ERASED, when the confirm BUTTON 1 is clicked.
      // When checked, a clear explanation and warning is displayed, else not:
      while (this.z.buttonNumber === 3) {
        if (document.getElementById('Choice_3').checked === true) {
          document.querySelector('span.Choice_3 label').innerHTML = SP + ' ' + this.intl.t('write.eraseOption') + '. <b style="color:#df1837">' + this.intl.t('write.eraseOption1') + '</b> ' + this.intl.t('write.eraseOption2');
          await new Promise (z => setTimeout (z, 199)); // eraseFunc 3
        } else {
          document.querySelector('span.Choice_3 label').innerHTML = SP + ' ' + this.intl.t('write.eraseOption');
          await new Promise (z => setTimeout (z, 199)); // eraseFunc 4
        }
      }
      if (this.z.buttonNumber === 1) {
        this.z.closeDialog(dialogChooseId);
        document.querySelector('img.spinner').style.display = '';
        let errNames = [];
        for (let img of imgs) {
          let imgName = img.id.slice(1);
          let imgTitle = document.querySelector('#i' + this.z.escapeDots(imgName) + ' img.left-click').getAttribute('title');
          let imgPath = this.z.userDir + '/' + imgTitle;
          let path = imgPath.replace(/[^/]+$/, ''); //remove file name

          if (img.classList.contains('symlink')) {
            // Save the linked-to-path for safety
            let lnkdPath = await this.z.execute('readlink -nsq ' + imgPath);
              // this.z.loli(lnkdPath, 'color:yellow');
            if (lnkdPath.slice(0, 1) !== '.') {
              this.z.loli('Bad symlink: ' + lnkdPath, 'color:yellow');
            }
            let err = await this.z.execute('rm ' + imgPath);
              // this.z.loli('rm ' + imgPath, 'color:pink');
            if (err) {
              errNames.push(imgName)
            } else {
              this.z.loli('symlink ' + imgTitle + ' deleted', 'color:lightgreen');
              img.remove();
              await this.z.execute('rm -f ' + path + '_mini_' + imgName + '.png');
              await this.z.execute('rm -f ' + path + '_show_' + imgName + '.png');
                // this.z.loli('rm -f ' + path + '_mini_' + imgName + '.png', 'color:pink');
                // this.z.loli('rm -f ' + path + '_show_' + imgName + '.png', 'color:pink');
            }
            if (document.getElementById('Choice_3').checked === true) {
              // If we work in the picFound album, remove the random appendix of imgName:
              if (imgTitle.indexOf('/' + this.z.picFound) >-1) {
                imgName = imgName.replace(/\.[^./]*$/, '');
              }
              lnkdPath = lnkdPath.replace(/^\.*(\/\.+)*/, ''); //remove leading '.' etc.
              let origPath = lnkdPath.replace(/[^/]+$/, ''); //remove file name
              let CSP = this.z.userDir + '/' + this.z.imdbRoot + lnkdPath; // C.s.p
              let err = await this.z.execute('rm -f ' + CSP); // Complete server path
                // this.z.loli('rm -f ' + CSP, 'color:pink');
              if (err) {
                errNames.push(imgName)
              } else {
                  // console.log('>>>erased:', CSP);
                await this.z.sqlUpdate(CSP); // Complete server path
                this.z.loli('  NOTE: original ' + this.z.imdbRoot + lnkdPath + ' also deleted', 'color:red');
                await this.z.execute('rm -f ' + this.z.userDir + '/' + this.z.imdbRoot + origPath + '_mini_' + imgName + '.png');
                await this.z.execute('rm -f ' + this.z.userDir + '/' + this.z.imdbRoot + origPath + '_show_' + imgName + '.png');
                  // this.z.loli('rm -f ' + this.z.userDir + '/' + this.z.imdbRoot + origPath + '_mini_' + imgName + '.png', 'color:pink');
                  // this.z.loli('rm -f ' + this.z.userDir + '/' + this.z.imdbRoot + origPath + '_show_' + imgName + '.png', 'color:pink');
              }
            }

          } else {
            let CSP = imgPath; // C.s.p
            let err = await this.z.execute('rm -f ' + imgPath); // Complete server path
              // this.z.loli('rm -f ' + imgPath, 'color:pink');
            if (err) {
              errNames.push(imgName)
            } else {
                // console.log('>>>erased:', imgPath);
              await this.z.sqlUpdate(imgPath); // Complete server path
              this.z.loli(imgTitle + ' deleted', 'color:red');
              img.remove();
              await this.z.execute('rm -f ' + path + '_mini_' + imgName + '.png');
              await this.z.execute('rm -f ' + path + '_show_' + imgName + '.png');
                // this.z.loli('rm -f ' + path + '_mini_' + imgName + '.png', 'color:pink');
                // this.z.loli('rm -f ' + path + '_show_' + imgName + '.png', 'color:pink');
            }
          }
          // If at picFound: imgName is trunchated, preparied for remove of the original
            // this.z.loli(imgName, 'color:brown');
            // this.z.loli(imgTitle, 'color:brown');
            // this.z.loli(imgPath, 'color:brown');
            // this.z.loli(path, 'color:brown');
        }
        // Prepare summary message
        let n = imgs.length - errNames.length;
        let a = this.z.imdbDir;
        a = a ? this.z.handsomize2sp(a.replace(/^.*\/([^/]+)$/, '$1')) : this.z.imdbRoot;
        let tmp = '';
        if (n === 1) {
          tmp = this.intl.t('write.doErased1', {a: a});
          if (document.getElementById('Choice_3').checked === true) tmp += '<br><span style="color:#df1837">' + this.intl.t('write.doEraOri1') + '</span>';
        }
        else {
          tmp = this.intl.t('write.doErased', {n: n, a: a});
          if (document.getElementById('Choice_3').checked === true) tmp += '<br><span style="color:#df1837">' + this.intl.t('write.doEraOri') + '</span>';
        }
        if (errNames.length) {
          tmp += BR + BR + this.z.intl.t('write.noErased', {n: errNames.length, a: errNames.join(', ')});
        }
        this.z.alertMess(tmp);
        // Refresh the album tree:
        let selEl = document.getElementById('rootSel');
        selEl.value = this.z.imdbRoot;
        this.z.updateTree();
        await new Promise (z => setTimeout (z, 88));
        // Go back to the album we came from after root load
        this.z.openAlbum(fromIndex);
        document.querySelector('img.spinner').style.display = 'none';
        await new Promise (z => setTimeout (z, 666*n));
        this.z.countNumbers();
      } else {
        this.z.alertMess(this.intl.t('eraseCancelled'), 3);
      }
    } else {
      this.z.alertMess(this.intl.t('write.chosenNone'));
    }
    // this.z.closeDialogs();
    this.z.sortOrder = this.z.updateOrder();
    return;
  }

  @tracked eraseOrig = false;
  get toggleEraseOrig() {
    eraseOrig = !eraseOrig;
  }

  <template>
    <button class='menu_img' type="button" title="{{t 'imageMenu'}}"
    {{on 'click' (fn this.z.toggleMenuImg 1)}}
    {{on 'keydown' this.detectClose}}>⡇</button>
    <ul class="menu_img_list" style="text-align:left;display:none">

      <li><p style="text-align:right;color:deeppink;
        font-size:120%;line-height:80%;padding-bottom:0.125rem"
        {{on 'click' this.detectClose}}> × </p>
      </li>

      {{!-- Go-to-origin of linked image --}}
      {{#if this.symlink}}
        <li>
          <p class="goAlbum" style="color:#0a0;font-weight:bold;font-size:90%" title-2="{{t 'gotext'}} ”{{this.albname}}”"
          {{on 'click' (fn this.z.homeAlbum this.orig this.z.picName)}}> {{t 'goto'}} </p>
        </li>
      {{/if}}

      {{!-- Open image file information dialog --}}
      <li><p {{on 'click' (fn this.z.toggleDialog dialogInfoId)}}>
        {{t 'information'}}</p></li>

      {{!-- Open image text edit dialog --}}
      {{#if this.z.allow.textEdit}}
        <li><p {{on 'click' (fn this.z.toggleDialog dialogTextId)}}>
          {{t 'editext'}}</p></li>
      {{/if}}

      {{!-- Edit this image --}}
      {{#if this.z.allow.imgEdit}}
        <li><p {{on 'click' (fn this.z.futureNotYet 'editimage')}}>
          {{t 'editimage'}}</p></li>
      {{/if}}

      {{!-- Hide or show image(s) --}}
      {{#if this.z.allow.imgHidden}}
        <li><p {{on 'click' (fn this.hideShow)}}>
          <span style="font-size:124%;line-height:50%">
            ○</span>{{t 'hideshow'}}</p></li>

      {{!-- Mark (check) only hidden images --}}
      <li><p {{on 'click' (fn this.markHidden)}}>
        <span style="font-size:124%;line-height:50%">
            ○</span>{{t 'markhidden'}}</p></li>
      {{/if}}
      <li><hr style="margin:0.25rem 0.5rem"></li>

      {{!-- Check or uncheck all images --}}
      <li><p {{on 'click' (fn this.checkUncheck)}}>
        <span style="font-size:124%;line-height:50%">
          ○</span>{{t 'checkuncheck'}}</p></li>

      {{!-- Invert selection (marked/checked) --}}
      <li><p {{on 'click' (fn this.invertSelection)}}>
        <span style="font-size:124%;line-height:50%">
          ○</span>{{t 'invertsel'}}</p></li>

      {{#if this.z.allow.imgReorder}}
        {{!-- Place image(s) first --}}
        <li><p {{on 'click' (fn this.placeFirst true)}}>
          <span style="font-size:124%;line-height:50%">
            ○</span>{{t 'placefirst'}}</p></li>

        {{!-- Placeimages(s) a the end --}}
        <li><p {{on 'click' (fn this.placeFirst false)}}>
          <span style="font-size:124%;line-height:50%">
            ○</span>{{t 'placelast'}}</p></li>
      {{/if}}

      {{!-- Download images from this album --}}
      {{#if this.z.allow.imgOriginal}}
        {{!-- <li><p {{on 'click' (fn this.z.futureNotYet 'download')}}> --}}
        <li><p {{on 'click' this.downLoad}}>
          {{t 'download'}}</p></li>
      {{/if}}
      <li><hr style="margin:0.25rem 0.5rem"></li>

      {{!-- Link image(s) to another album --}}
      {{#if this.z.allow.delcreLink}}
      {{#if this.notSymlink}}
        <li><p {{on 'click' (fn this.linkFunc)}}>
          <span style="font-size:124%;line-height:50%">
          ○</span>{{t 'linkto'}}</p></li>
      {{/if}}
      {{/if}}

      {{!-- Move image(s) to another album --}}
      {{#if this.z.allow.delcreLink}}
        <li><p {{on 'click' (fn this.moveFunc)}}>
          <span style="font-size:124%;line-height:50%">
          ○</span>{{t 'moveto'}}</p></li>
      {{/if}}

      {{!-- Erase image(s)  --}}
      {{#if this.z.allow.deleteImg}}
        <li><p {{on 'click' (fn this.eraseFunc)}}>
          <span style="font-size:124%;line-height:50%">
          ○</span>{{t 'remove'}}</p></li>
      {{/if}}

    </ul>
  </template>

}

// NOTE: The chooseAlbum dialog is designed for chosing destination
// album before moving/linking images via the image menus
export class ChooseAlbum extends Component {
  @service('common-storage') z;
  @service intl;

  @tracked which = -1;
  @tracked indices = [];

  // Detect closing Esc (27) key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) this.closeChooseAlbum();
  }

  // Which album was selected?
  whichAlbum = (e) => {
    var elRadio = e.target;
      // this.z.loli(`${elRadio.id} ${elRadio.checked}`, 'color:red');
    this.which = Number(elRadio.id.slice(5));
    document.querySelector('#chooseAlbum main button').disabled = false;
    document.getElementById('putWhere').style.display = ''; // putWhere, planned
  }

  // Filter away the actual and the temporary albums:
  filterAlbum = (index) => {
    return this.z.imdbDirs[index] === this.z.imdbDir || this.z.imdbDirs[index].slice(1) === this.z.picFound ? false : true;
  }

  // Display the album name or root
  get chosenAlbum() {
    let a = this.z.imdbDirs[this.which];
    return a ? this.z.handsomize2sp(a.replace(/^.*\/([^/]+)$/, '$1')) : this.z.imdbRoot;
  }

  // NOTE: See next note!
  closeChooseAlbum = (doit) => {
    document.querySelector('#chooseAlbum main button').disabled = true;
    document.getElementById('putWhere').style.display = 'none'; // putWhere, planned
    this.z.closeDialog('chooseAlbum');
    if (doit) this.doLinkMove();
    else this.which = -1;
  }

  // NOTE: This is doLink and doMove combined! Called when
  // the chooseAlbum dialog is closed by closeChooseAlbum
  doLinkMove = async () => {
    let fromIndex = this.z.imdbDirIndex;
    let pics = selMinImgs(this.z.picName);
    let cmd = [];
    var picNames = [];
    // ******************************************************
    // chooseText starts with ”0” (=>false) if ”doMove” (below)
    // Else, here is with non-zero (=>true), ”doLink”:
    if (Number(this.z.chooseText.slice(0, 1))) {
        // this.z.alertMess('perform some linking');
      let value = this.z.imdbDirs[this.which];
      this.z.loli('linking to ' + this.z.imdbRoot + value);
      var lpath = this.z.imdbPath + value;
        // this.z.loli(lpath, 'color:red');
      for (let i=0;i<pics.length;i++) {
          // this.z.loli(pics[i].id.slice(1), 'color:red');
        picNames.push(pics[i].id.slice(1));
      }
      for (let i=0;i<pics.length;i++) {
        let linkfrom = document.getElementById('i' + picNames[i]).querySelector('img.left-click').getAttribute('title').replace(/^[^/]+/, '');
        linkfrom = '../'.repeat(value.split('/').length - 1) + linkfrom.slice(1);
        let linkto = lpath + '/' + picNames[i];
        linkto += linkfrom.match(/\.[^.]*$/);
        cmd.push('ln -sf ' + linkfrom + ' ' + linkto);
      }
        // this.z.loli(LF + cmd.join(LF), 'color:pink');
      for (let i=0;i<pics.length;i++) {
        let r = await this.z.execute(cmd[i]);
        if (r) this.z.loli('Not linked: ' + picNames[i]);
      }
      this.z.alertMess(this.intl.t('write.doLinked', {n: pics.length, a: this.chosenAlbum}));
      // Refresh the album tree:
      // let selEl = document.getElementById('rootSel');
      // selEl.value = this.z.imdbRoot;
      this.z.updateTree();
      await new Promise (z => setTimeout (z, 88));
      // selEl.dispatchEvent(new Event('change'));
      // await new Promise (z => setTimeout (z, 888));
      // Back to the album we came from
      this.z.openAlbum(fromIndex);
    // ******************************************************
    // chooseText starts with ”0” if ”doMove”, ”doMove” here:
    } else {
        // this.z.alertMess('perform some moving');
      let malbum = this.z.imdbDirs[this.which];
      var lpp = malbum.split("/").length-1;
      if (lpp > 0)lpp="../".repeat(lpp);
      else lpp="./";
      this.z.loli('moving to ' + this.z.imdbRoot + malbum);
      let mpath = this.z.imdbPath + malbum;
        // this.z.loli(mpath, 'color:red');
      for (let i=0;i<pics.length;i++) {
          // this.z.loli(pics[i].id.slice(1), 'color:red');
        picNames.push(pics[i].id.slice(1));
      }
      for (let i=0;i<pics.length;i++){
        let move = this.z.userDir + '/' + document.getElementById('i' + picNames[i]).querySelector('img.left-click').getAttribute('title');
        let mini = move.replace(/([^/]+)(\.[^/.]+)$/,'_mini_$1.png');
        let show = move.replace(/([^/]+)(\.[^/.]+)$/,'_show_$1.png');
        let moveto = mpath + '/';
        let picfound = this.z.picFound;

        // Display the spinner
        document.querySelector('img.spinner').style.display = '';

        // Bash command string ”cmd” (some is prepared above):

        // The following code will move even links, where link sources are modified
        // accordingly. Even random suffixes are deleted from picture names of links
        // moved from picfound (= this.z.picFound). Also move links!

        //   malbum = album selected to move pictures into
        //    mpath = the corresponding actual path, moveto==mpath/
        // picNames = the names of the pictures in the current album, to be moved
        // move|mini|show = the path to the original|mini|show pictures to be moved
        // picfound = the name of the temporary album where found pictures are kept

        // If picfound appears in the path, a random suffix has to be removed from
        // the picNames (commands with $picfound will else have no effect) NOTE: I think

        // It is a Bash text string containing in the magnitude of 1000 characters,
        // depending on actual file names, but well within the Bash line length limit.

        cmd = 'picfound=' + picfound + ';move=' + move + ';mini=' + mini + ';show=' + show + ';orgmove=$move;orgmini=$mini;orgshow=$show;moveto=' + moveto + ';lpp=' + lpp + ';lnksave=$(readlink -n $move);';
        cmd += 'if [ $lnksave ];then move=$(echo $move|sed -e "s/\\(.*$picfound.*\\)\\.[^.\\/]\\+\\(\\.[^.\\/]\\+$\\)/\\1\\2/");';
        cmd += 'mini=$(echo $mini|sed -e "s/\\(.*$picfound.*\\)\\.[^.\\/]\\+\\(\\.[^.\\/]\\+$\\)/\\1\\2/");';
        cmd += 'show=$(echo $show|sed -e "s/\\(.*$picfound.*\\)\\.[^.\\/]\\+\\(\\.[^.\\/]\\+$\\)/\\1\\2/");';
        cmd += 'lnkfrom=$(echo $lnksave|sed -e "s/^\\(\\.\\{1,2\\}\\/\\)*//" -e "s,^,$lpp,");';
        cmd += 'lnkmini=$(echo $lnkfrom|sed -e "s/\\([^/]\\+\\)\\(\\.[^/.]\\+\\)\\$/_mini_\\1\\.png/");';
        cmd += 'lnkshow=$(echo $lnkfrom|sed -e "s/\\([^/]\\+\\)\\(\\.[^/.]\\+\\)\\$/_show_\\1\\.png/");';
        cmd += 'ln -sfn $lnkfrom $move;fi;mv -n $move $moveto;';
        cmd += 'if [ $? -ne 0 ];then if [ $move != $orgmove ];then rm $move;fi;exit;';
        cmd += 'else if [ $lnksave ];then ln -sfn $lnkmini $mini;';
        cmd += 'ln -sfn $lnkshow $show;';
        cmd += 'fi;mv -n $mini $show $moveto;';
        cmd += 'if [ $move != $orgmove ];then rm $orgmove;fi;';
        cmd += 'if [ $mini != $orgmini ];then rm $orgmini;fi;';
        cmd += 'if [ $show != $orgshow ];then rm $orgshow;fi;fi;';

        moveto += move.replace(/^.*\/([^/]+)$/, '$1'); //path + basename
        // If 'move' contains 'picFound' the file name's random (4 ch) suffix must
        // be removed, since normally its files are symlinks with such suffixes.
        if (move.indexOf(this.z.picFound) > -1)
            moveto = moveto.replace(/^(.+\.)([^.]{4}\.)([^.]+)$/, '$1'+'$3');

          // this.z.loli(cmd.replace(/;/g, ';\n').replace(/\nthen /g, 'then\n').replace(/else /g, 'else\n'), 'color:red');
        let r = await this.z.execute(cmd);
        if (r) this.z.loli('Not moved: ' + picNames[i] + '\n' + r);
          // console.log('>>>moved from:', move);
          // console.log('  >>>moved to:', moveto);
        await this.z.sqlUpdate(move + LF + moveto); // Complete server paths
      }

      this.z.alertMess(this.intl.t('write.doMoved', {n: pics.length, a: this.chosenAlbum}));

      // Refresh the album tree:
      // let selEl = document.getElementById('rootSel');
      // selEl.value = this.z.imdbRoot;
      this.z.updateTree();
      await new Promise (z => setTimeout (z, 88));
      // selEl.dispatchEvent(new Event('change')); // Go to root album (auto)
      // await new Promise (z => setTimeout (z, 5888)); // Increased 5s ...

      // Go back to the album we came from after root load
      this.z.openAlbum(fromIndex);
      // Go to the destination album
      // this.z.openAlbum(this.which);
    }
    this.which = -1;
    // this.z.openAlbum(this.z.imdbDirIndex); // Reloads current album
    this.z.countNumbers();
  }

  get selectAlbum() { // chooseText[1]==”0” if ”doMove”, else ”doLink” in ”doLinkMove”
    return this.z.chooseText.slice(0, 1) === '0' ? this.intl.t('selectAlbumMove') : this.intl.t('selectAlbumLink');
  }

  drop1 = (txt) => txt.slice(1);

  <template>
    <dialog id="chooseAlbum" style="z-index:999" {{on 'keydown' this.detectEscClose}}>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p style="color:blue">{{t 'selectTarget'}}<span></span></p>
        </div><div>
          <button class="close" type="button" {{on 'click' (fn this.closeChooseAlbum false)}}>×</button>
        </div>
      </header>
      <main style="padding:0.5rem">

        <b>{{this.selectAlbum}}</b>
        <span>(”.” = ”{{this.z.imdbRoot}}”)</span><br>
        <div class="albumList">

          {{#each this.z.imdbDirs as |album index|}}
            {{#if (this.filterAlbum index)}}
              <span class="pselect glue">
                <input id="album{{index}}" type="radio" name="albumList" {{on 'click' this.whichAlbum}}>
                <label for="album{{index}}" style="display:block;margin-left:1rem">
                  &nbsp;<span style="font-size:77%;vertical-align:top">{{index}}</span>&nbsp;”.{{album}}”
                </label>
              </span>
            {{/if}}
          {{else}}
            {{t 'write.foundNoAlbums'}}
          {{/each}}

        </div>

        {{#if (eq this.which -1)}}
          <b style="color:blue">{{t 'write.chooseAlbum'}}</b><br>
        {{else}}
          {{{t 'write.chooseThis' a=this.chosenAlbum}}}<br>({{t 'placeWhere'}})<br>
        {{/if}}
        <button type="button" {{on 'click' (fn this.closeChooseAlbum true)}} disabled>{{{this.drop1 this.z.chooseText}}}</button><br>

        <span id="putWhere" class="glue" style="display:none">
          {{!-- BELOW: Perhaps a future option! --}}
          {{!-- <input id="putFirst" type="radio" name="orderList" checked>
          <label for="putFirst" style="display:block;margin-left:.1rem">
            &nbsp;&nbsp;{{t 'placeFirst'}}
          </label>
          <input id="putLast" type="radio" name="orderList">
          <label for="putLast" style="display:block;margin-left:.1rem">
            &nbsp;&nbsp;{{t 'placeLast'}}
          </label> --}}
        </span>

      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.closeChooseAlbum false)}}>{{t 'button.cancel'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>

}
