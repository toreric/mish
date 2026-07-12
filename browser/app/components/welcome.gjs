//== Mish main component Welcome
//   'Welcome' is referenced in 'templates/applications.hbs'

//   NOTE: 'DialogSettings' ends this file
import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { modifier } from 'ember-modifier';
import { cell } from 'ember-resources';
import { makeDialogDraggable } from 'dialog-draggable';
import { getPromiseState } from 'reactiveweb/get-promise-state';

import { Clock } from './clock';
// import { ButtonsLeft } from './buttons-left';
// import { ButtonsRight } from './buttons-right';
import { DialogAlert } from './dialog-alert';
import { DialogChoose } from './dialog-choose';
import { DialogFind } from './dialog-find';
import { DialogHelp } from './dialog-help';
// import { DialogInfo } from './dialog-info';
// import { DialogLogin } from './dialog-login';
import { DialogText } from './dialog-text';
// import { DialogTools } from './dialog-tools';
import { DialogXper } from './dialog-xper';
import Header from './header';
import { Language } from './language';
// import { MenuImage } from './menu-image';
import { ChooseAlbum } from './menu-image';
import { MenuMain } from './menu-main';
import { ViewMain } from './view-main';
import RefreshThis from './refresh-this';
import { Spinner } from './spinner';

import he from 'he';
// USE: <div title={{he.decode 'text'}}></div> ['he' = HTML entities]
// or  txt = he.decode('text')  or  txt = he.encode('text')

// The DialogSettings dialog is ending this code

const returnValue = cell(''); // Never used?
const LF = '\n';
const CRLF = '&#13;&#10;'; // May be used in 'title': the only mod.possible!
let BEEP = 0, POOP = 0;    // Mousedown beep and poopup

// NOTE: Here makeDialogDraggable() declares 'data-dialog-draggable'
// so it may be further referenced in child elements of any <dialog>
makeDialogDraggable();

// Detect various keys
document.addEventListener('keydown', (event) => {

  event.stopPropagation();
  var key = event.code;
    // console.log('Key ' + key + ' pressed');
  switch(key) {
    case 'Escape':  // Esc
        // console.log(event.target);
      resetBorders();
      for (let d of document.querySelectorAll('dialog')) {
        if (d.hasAttribute('open')) {
          if (d.id === 'dialogInfo') d.close();
          if (d.id === 'dialogUtil') d.close();
          if (d.id === 'dialogHelp') d.close();
          // return;
        }
      }
      if (!document.getElementById('menuMain').style.display)
        document.getElementById('menuButton').click(); //close menu
      // The view image is displayed with its navigation buttons:
      if (!document.querySelector('div.nav_links').style.display)
        document.getElementById('go_back').click(); //close view image
      break;
    case 'ArrowLeft':  // <
      if (document.activeElement.nodeName === 'TEXTAREA') break;
      document.querySelector('.nav_.prev').click();
      break;
    case 'ArrowRight':  // >
      if (document.activeElement.nodeName === 'TEXTAREA') break;
      document.querySelector('.nav_.next').click();
      break;
    case 'KeyA':  // A
      if (document.activeElement.nodeName === 'TEXTAREA') break;
      break;
    case 'KeyF':  // F
      if (document.activeElement.nodeName === 'TEXTAREA') break;
      event.preventDefault();
      document.getElementById('searchText').click();
      break;
    case 'F1': // F1
      toggleDialog('dialogHelp');
  }
});

var aud = new AudioContext();
// vol: 0 to 100, freq: Hz, duration: milliseconds
const beep  =  function(vol, freq, duration){
  let v = aud.createOscillator();
  let u = aud.createGain();
  v.connect(u);
  v.frequency.value = freq;
  v.type = "square";
  u.connect(aud.destination);
  u.gain.value = vol*0.01;
  v.start(aud.currentTime);
  v.stop(aud.currentTime + duration*0.001);
}



// ALL bubbling mousedowns are caught, even programmatical clicks!
// Important: ”document.body.” excludes SCROLLBARS, if any!
document.body.addEventListener('mousedown', async (event) => {
    // console.log('event:', event);
    // console.log('1target:', event.target.tagName);
  var tgt = event.target;
    // console.log('NODENAME =', tgt.nodeName);
  if (
    event.button !== 0 || // 0=left, 1=wheel, 2=right
    // Within these there should be no extra 'mousedown' action,
    // since there is rather another 'click' detection:
    tgt.closest('.menu_img_list') ||
    tgt.closest('.toggleNavInfo') ||
    tgt.closest('#link_show ul') ||
    tgt.closest('#smallButtons') ||
    tgt.closest('#smallButtons1') ||
    // tgt.closest('#upperButtons') ||
    tgt.closest('#link_texts') ||
    tgt.closest('.nav_links') ||
    tgt.closest('.tmpHeader') ||
    tgt.closest('.img_show') ||
    tgt.closest('#markShow') ||
    tgt.closest('.menu_img') ||
    tgt.closest('#do_mail') ||
    tgt.closest('dialog')
  ) { return; }
  resetBorders();

  // Close any open image menu
  let allist = document.querySelectorAll('.menu_img_list');
  for (let list of allist) list.style.display = 'none';

  // Detect closing click outside menuMain (tricky case!)
  var tmp0 = document.getElementById('menuButton');
  var tmp1 = document.getElementById('menuMain');
  if (
    tmp1.style.display !== 'none' &&
    tgt !== tmp0 &&
    tgt !== tmp1 &&
    !tmp0.contains(tgt) &&
    !tmp1.contains(tgt)
  ) tmp0.click();
  // Close the show image view, if open
  if (!document.querySelector('div.nav_links').style.display)
    document.getElementById('go_back').click();
  return;
});

// ALL bubbling mouseups should be caught
// Important: ”document.body.” excludes SCROLLBARS, if any!
document.body.addEventListener('mouseup', async (event) => {
  let tgt = event.target;
  let tgtid = tgt.id;
    // console.log('event:', event);
    // console.log('2target:', tgt.tagName);
  // event.stopPropagation();
  // beep 50% at 550 Hz in 100 ms
  if (BEEP) beep(50, 550, 100);
  if (POOP) { // The mouse click visual popup spinner
    let poop = document.getElementById('poop');
    poop.style.zIndex = 12000;
    poop.style.left = event.clientX - 50 + 'px';
    poop.style.top = event.clientY - 50 + 'px';
      // console.log('coordinates', event.clientX, event.clientY);
    poop.style.display = '';
    setTimeout(function() {
      poop.style.display = 'none';
    }, 250)
  }
  // This is to prevent closing dialogText, which is triggered from
  // some weird unknown reason at mouseup after dragging the dialog.
  // Thus it has to be reopened, and this will do it, just in case:
  if (tgtid === 'dialogText') {
    await new Promise (z => setTimeout (z, 6)); // welcome, mouseup
    tgt.show();
  }
  return;
});

const resetBorders = () => { //copy from z
  var minObj = document.querySelectorAll('.img_mini img.left-click');
  for (let min of minObj) {
    min.classList.remove('dotted');
  }
}
const toggleDialog = (dialogId, origPos) => { //copy from common-storage (z)
  let diaObj = document.getElementById(dialogId);
  let what = 'closed ';
  if (diaObj.hasAttribute('open')) {
    diaObj.close();
  } else {
    what = 'opened ';
    if (origPos) diaObj.style.display = '';
    diaObj.show();
  }
  console.log('-"-: ' + what + dialogId);
}

class Welcome extends Component {
  @service('common-storage') z;
  @service intl;

  greet = () => { getPromiseState(this.getCred()); } // avoid "obj" printout


  someFunction = (param) => {this.z.loli(param, 'color:red');}

  get album() {
    return this.z.imdbRoot + this.z.imdbDir;
  }

  // To be executed only once before a user is defined with userStatus
  getCred = async () => {
      // this.z.loli('getCred count = ' + this.z.refreshTexts, 'color:yellow');
    if (this.z.refreshTexts) return; // First time if zero
    this.z.refreshTexts++ // this counter/trigger has another use later
    //await new Promise (z => setTimeout (z, 99)); // Allow userStatus to settle
    await new Promise (z => setTimeout (z, 2299)); // getCred: with Vite 2026
    if (!this.z.userStatus) { // only once
      this.z.loli('getCred RUNNING', 'color:yellow')

      // Various settings
      this.z.displayNames = 'none'; // Hide image names
      this.z.initBrowser();         // Manipulate browser back-arrow
      this.z.imdbRoot = await this.z.execute('echo -n $IMDB_ROOT'); // Server environment
      if (this.z.imdbRoot === '""') this.z.imdbRoot = ''; // See the node-express script!
      await new Promise (z => setTimeout (z, 99)); // getCred: before awakening the system

      // Read the build stamp files (nodestamp.txt may be initially missing) etc.
      this.z.aboutThis = 'Mish ' + await this.z.execute('cat buildstamp.txt') + ' ' + await this.z.execute('cat nodestamp.txt') + ' and Glimmer by Ember<br>' + await this.z.execute('head -n1 LICENSE.txt');

      // Set a guest user and corresponding allowances
      let allowances = await this.z.getCredentials('Get allowances');
        // console.log(allowances); // this is the text table of rights
      this.z.allowances = allowances;

      // Language cookie
      let lng = this.z.getCookie('mish_lang');
      await new Promise (z => setTimeout (z, 99)); // Needed sometimes
      if (lng) {
        // A lot of trial-and-error came to that the simplest way to
        // initiate the right user name language are these two lines:
        document.querySelector('span.langflags.en-us').click();
        document.querySelector('span.langflags.' + lng).click();
      }
      this.z.intlCodeCurr = lng;
      // Each language must define it's picFound name, initially.
      // At a subsequent lnguage change, the picFound name will not change.
      this.z.RID = Math.random().toString(36).slice(2,6);
      this.z.picFound = this.z.picFoundBaseName + '.' + this.z.RID;

      // Background cookie
      if (this.z.getCookie('mish_bkgr') === 'dark') {
        this.z.bkgrColor = '#111';
        this.z.textColor = '#fff';
        this.z.subColor = '#aef';
        document.querySelector('#dark_light').classList.remove('darkbkg');
      } else {
      // if (this.z.getCookie('mish_bkgr') === 'light') {
        this.z.bkgrColor = '#cbcbcb';
        this.z.textColor = '#111';
        this.z.subColor = '#146';
        document.querySelector('#dark_light').classList.add('darkbkg');
      }
      document.querySelector('body').style.background = this.z.bkgrColor;
      document.querySelector('body').style.color = this.z.textColor;

      // NOTE: Language should be set before getCredentials()
      // Get all recorded user statuses and their allowances + passwordless users
      let cred = (await this.z.getCredentials('Get user name')).split(LF);
      this.z.userStatus = cred[1];
      this.z.allowvalue = cred[2];
      this.z.freeUsers = cred[3];
      this.z.imdbRoot = cred[4]; // Non-empty if defined at server startup
        // this.z.loli('imdbRoot = ' + this.z.imdbRoot, 'color:red');
      this.z.allowFunc(); // SET ALLOWANCES PATTERN important!

      // Get album-collection-qualified directories
      let roots = await this.z.getAlbumRoots();
        // this.z.loli('roots\n' + roots, 'color:red');
      this.z.imdbRoots = roots.split(LF);
    }
    // Now check if the album root is already chosen and if so,
    // ensure it belongs to the options in its select statement:
    if (this.z.imdbRoot && this.z.imdbRoots.indexOf(this.z.imdbRoot) > -1) {
      await new Promise (z => setTimeout (z, 22));
      let selEl = document.getElementById('rootSel');
      selEl.value = this.z.imdbRoot;
      await new Promise (z => setTimeout (z, 88));
      selEl.dispatchEvent(new Event('change'));
      await new Promise (z => setTimeout (z, 888));
    } else {
      this.z.openMainMenu();
    }
    // HERE MORE INITIAL ACTIONS may be added as last line(s)
  }

  goHome = () => {
    return he.decode(this.intl.t('home')); // allows &nbsp;
  }
  mainHome = () => {
    return he.decode(this.intl.t('homemain')); // allows &nbsp;
  }
}

// const executeOnInsert = modifier((element, [component]) => {
//   component.geCr();
// });

export default class extends Welcome {
  <template>

    <div id='highUp'></div>
    <RefreshThis @for={{this.z.refreshTexts}}>
      {{!-- The mouse click visual popup spinner --}}
      <div id="poop" style="position:fixed;display:none;left:0;top:0;width:100px;height:100px;background-image:url(/images/spinner.svg)"></div>
    </RefreshThis>

    <div id="upperButtons" style="position:relative;top:0;left:0;width:100%;padding-top:0.5rem">

      {{!-- <div {{executeOnInsert this}} class="" style="display:flex;justify-content:space-between;margin:0 3.25rem 0 4rem"> --}}
      <div style="display:flex;justify-content:space-between;margin:0 0.75rem 0 4rem">

        <span>
          <Language />

          <button id="dark_light" style="line-height:0.65rem;margin-left:0.1rem" type="button" title-2="{{t 'button.backgtitle'}}: {{t 'dark'}}/{{t 'light'}}" {{on 'click' (fn this.z.toggleBackg)}}>&nbsp;</button>

          <b style="font-size:106%;margin-top:0.35rem;display:inline-block">
            {{t "header"}}
          </b>&nbsp;&nbsp;
        </span>

        <span style="margin-top:0.25rem">

          {{#if this.z.allow.deleteImg}}
            {{!-- Open an experimental/test dialog --}}
            <button type="button" title="Xperimental" style="background:transparent;height:1.1rem;border:0.5px solid #909;border-radius:50%" {{on 'click' (fn this.z.toggleDialog 'dialogXper')}}>&nbsp;&nbsp;</button>
          {{/if}}

          <span id="loggedInUser">
            {{!-- Open the Settings dialog --}}
            {{#if this.z.allow.textEdit}}
              <button type="button" style="background:url(/images/settings.png) center 0/1.13rem no-repeat;border:0" title-2="{{t 'settings'}}" {{on 'click' (fn this.z.toggleDialog 'dialogSettings')}}> &nbsp; &nbsp;</button>
            {{/if}}

            {{!-- Open the Login and Rights dialog --}}
            <button type="button" style="background:url(/images/lawyer.png) center -0.125rem/1.6rem no-repeat;border:0;border-radius:0" title-2="{{t 'button.optchuser'}}" {{on 'click' (fn this.z.openModalDialog 'dialogLogin' 0)}}> &nbsp; &nbsp;</button>

            {{!-- Present who's logged in with rights --}}
            {{t 'loggedIn'}}: <b>{{this.z.userName}}</b>
            {{t 'with'}} [{{this.z.userStatus}}]-{{t 'rights'}}&nbsp;&nbsp;
          </span>

        </span>

      </div>

      <div class="" style="display:flex;justify-content:space-between;margin:0.2rem 0.75rem 0.4rem 4rem">

        {{#if this.z.imdbRoot}}
          {{#if this.z.imdbDir}}
            {{!-- Link to the “home“ location = album root = collection --}}
            <span style="opacity:0.6">
              <a style="text-decoration:underline" {{on 'click' (fn this.z.openAlbum 0)}}>
                <span style="font:small-caps bold 0.9rem sans-serif">{{this.goHome}}</span>
                <b>{{this.z.imdbRoot}}</b>
              </a>
            </span>
          {{else}}
            {{!-- State that this is the “home“ location --}}
            <span style="opacity:0.6">
              <b>{{this.z.imdbRoot}} <span style="font:small-caps bold 0.9rem sans-serif">{{this.mainHome}}</span></b>
            </span>
          {{/if}}
        {{else}}
          {{!-- State that no collection yet selected --}}
          <span>
            {{t 'noCollSelected'}}
          </span>
        {{/if}}
        <span>&nbsp;</span>

        {{!-- Display the current time --}}
        <div style="display:inline-block;font-size:85%">{{t 'time.text'}}&nbsp;<Clock @locale={{this.z.intlCodeCurr}} />&nbsp;&nbsp;</div>

        {{!-- NOTE: This extra commented-out  link is for emergency only if the
        browser's back arrow fails due to problems in the initBrowser-goBack
        cooperation in the CommonStorage service:
        <a {{on 'click' (fn this.z.goBack)}}>&nbsp;&lt;- go back&nbsp;</a> --}}

      </div>

    </div>

    {{!-- <ButtonsLeft /> included in ViewMain --}}
    <MenuMain />
    <ChooseAlbum />
    {{!-- <MenuImage /> included in ViewMain --}}
    {{!-- <ButtonsRight /> included in ViewMain --}}
    <Header />
    <ViewMain />

    <div id='lowDown'></div>
    <p style="font:small-caps 0.9rem sans-serif;color:#ff1493;text-align:center">
      {{this.z.edgeImage}}
    </p>

    <p class="footer" style="text-align:center;font:77% sans-serif">
      {{{this.z.aboutThis}}}
      <br>

      <a href id="do_mail" style="font-size:2rem;margin:0" class="smBu" title={{t 'buttons.left.mail'}} {{on 'click' (fn this.someFunction 'doMail')}} src="/images/mail.svg">
      </a>

      <a id="netMeeting" class="smBu" title={{t 'buttons.left.meet'}}
      href="https://meet.jit.si/Minnenfr%C3%A5nS%C3%A4var%C3%A5dalenochHolm%C3%B6n" target="jitsi_window" draggable="false" ondragstart="return false" style="font-size:1.85rem;margin:0;padding:0 0.4rem 0.3rem 0.2rem">▣</a>

    </p>

    {{!-- <DialogLogin /> moved to ViewMain --}}
    <DialogText />
    <DialogFind />
    <DialogHelp />
    {{!-- <DialogInfo /> moved to ViewMain --}}
    <DialogAlert />
    <DialogChoose />
    <DialogXper @content={{this.album}} />
    {{!-- <DialogTools /> moved to ViewMain --}}
    <DialogSettings />
    <Spinner />

    {{this.greet}}
  </template>;
}

export class DialogSettings extends Component {
  @service('common-storage') z;
  @service intl;

  // Detect closing Esc key
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.code === 'Escape') { // Esc key
      if (document.getElementById('dialogSettings').open) this.z.closeDialog('dialogSettings');
    }
  }

  detectCheckbox = (e) => {
    const elCheckbox = e.target.closest('input[type="checkbox"]');
    if (!elCheckbox) return; // Not a checkbox element
      // this.z.loli(`${elCheckbox.id} ${elCheckbox.checked}`, 'color:red');
    let cboxes = document.querySelectorAll('#dialogSettings input[type="checkbox"]');
    for (let cbs of cboxes) {
      switch(cbs.id) {
        case 'setPoop':
          if (cbs.checked) POOP = 1; // Keydown poop on (visual popup)
          else POOP = 0; break;
        case 'setBeep':
          if (cbs.checked) BEEP = 1; // Keydown beep on
          else BEEP = 0; break;
      }
    }
  }

  get zpicFound() {
    return this.z.picFoundBaseName.replace(/[§_]/g, ' ');
  }

  handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      this.setMaxWarning(event);
      event.target.blur();
    }
  };

  get minv() { return 50 }  // This is where minimum of maxWarning is set
  get maxv() { return 300 } // This is where maximum of maxWarning is set
  // The default value 100 is set in common-storage.js (z)

  setMaxWarning = (event) => {
    let value = Number(event.target.value);
    if (value < this.minv) { value = this.minv; }
    if (value > this.maxv) { value = this.maxv; }
    this.z.maxWarning = value;
    event.target.value = value;
    document.querySelector('footer button').focus();
    this.z.loli('maxWarning set to ' + this.z.maxWarning, 'color:pink');
  }

  <template>
    <dialog id="dialogSettings" {{on 'keydown' this.detectEscClose}}>
      <header data-dialog-draggable>
        <div style="width:99%">
          <p><b>{{t 'settingsGeneral'}}</b></p>
        </div>
        <div>
          <button class="close" type="button" {{on 'click' (fn this.z.closeDialog 'dialogSettings')}}>×</button>
        </div>
      </header>
      {{!-- <main style="text-align:center" style="text-align:center;min-height:10rem"> --}}
      <main style="padding:0 0.75rem;max-height:24rem" width="99%">

        <div style="padding:0.5rem 0;line-height:1.4rem">

          {{t 'write.set0'}}:<br>
          {{!-- <button id="dark_light" style="line-height:0.65rem;margin-right:-0.25rem;" type="button" {{on 'click' (fn this.z.toggleBackg)}}>&nbsp;</button>
          <label for="dark_light">{{t 'button.backgtitle'}}: {{t 'dark'}}/{{t 'light'}}</label><br> --}}
          <div class="glue" style="margin-top:0.5rem">
            <input id="setPoop" name="settings" value="" type="checkbox" {{on 'click' this.detectCheckbox}}>
            <label for="setPoop"> &nbsp;{{t 'write.setPoop'}}</label>
          </div>
          <div class="glue">
            <input id="setBeep" name="settings" value="" type="checkbox" {{on 'click' this.detectCheckbox}}>
            <label for="setBeep"> &nbsp;{{t 'write.setBeep'}}</label>
          </div>
          <div style="display:inline-block;margin-top:0.5rem">
            {{t 'recommended'}}:&nbsp;
            <input class="threedig" min={{this.minv}} max={{this.maxv}} value={{this.z.maxWarning}} title-1="{{t 'select.value'}} 50–300" type="number" {{on "keydown" this.handleKeyDown}} {{on "blur" this.setMaxWarning}} />
            <br>(= {{t 'maxfor'}} <b>{{this.zpicFound}}</b>, {{t 'changeWithReason'}})
          </div>

        </div>

      </main>
      <footer data-dialog-draggable>
        <button type="button" {{on 'click' (fn this.z.closeDialog 'dialogSettings')}}>{{t 'button.close'}}</button>&nbsp;
      </footer>
    </dialog>
  </template>

}
