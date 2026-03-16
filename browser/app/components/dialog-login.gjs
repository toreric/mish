//== Mish login dialog

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { action } from '@ember/object';

import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';

// Note: Dialog function in Welcome needs dialog*Id:
export const dialogLoginId = 'dialogLogin';
export const dialogRightsId = 'dialogRights';

const LF = '\n';

export class DialogLogin extends Component {
  @service('common-storage') z;
  @service intl;

  get picName() { // this.picName may replace this.z.picName, a code example.
    return this.z.picName;
  }

  logIn = async () => {
    let user = document.querySelector('input.user_').value.trim();
    if (!user) user = this.z.userName; // There is always a default user name
    // Get the credentials for user, cred = [password, userStatus, allowvalue, freeUsers]
    let cred = (await this.z.getCredentials(user)).split(LF);
    let pwrd = document.querySelector('input.password_').value.trim();

    if (cred[1] && ((cred[3].split(', ')).indexOf(user) < 0) && !cred[0]) {
      // TODO: Make an Admin facility to add new user/status entries into
      // _imdb_settings.sqlite; then, any user with no password though having a
      // status, thus newly entered into the _imdb_settings.sqlite user table,
      // shold be prompted to enter a new password.
        this.z.loli('user, status: ' + user + ', ' + cred[1] + ' (has no password)', 'color:red');
    }

    if (cred[1] && pwrd === cred[0]) { // No status for illegal users
      var oldUser = this.z.userName;
      document.getElementById('logInError').style.display = 'none';
      document.querySelector('input.user_').value = ' ';
      document.querySelector('input.password_').value = ' ';
      this.clearInput('user_');
      this.clearInput('password_');
      if (user !== oldUser) {
        this.z.clearMiniImgs();   // remove from display
        this.z.hasImages = false; // Don't show any old remains
        // User change measures: name, credentials, reselect album root:
        this.z.userName = user;
        this.z.userStatus = cred[1];
        this.z.allowvalue = cred[2];
        this.z.freeUsers = cred[3];
        this.z.allowFunc(); // SET ALLOWANCES PATTERN
        this.z.loli('logged in');
        // Manage the main menu and reset everything
        document.getElementById('rootSel').selectedIndex = -1;
        this.z.imdbCoco = '';
        this.z.imdbDir = '';
        this.z.imdbDirIndex = 0;
        this.z.imdbDirs = [''];
        this.z.imdbLabels = [''];
        this.z.imdbTree = null;
        if (!this.z.imdbRoot) this.z.openMainMenu();
        document.getElementById('rootSel').selectedIndex = 0;
        // Add blinking to emphasize a new user
        let usr = document.getElementById('loggedInUser'); //see Welcome
        usr.classList.add('blink');
        await new Promise (z => setTimeout (z, 999)); // logIn blink pause
        usr.classList.remove('blink');
      }
      this.z.closeDialog(dialogLoginId);
      document.querySelector('.mainMenu select').focus();
        // this.z.loli('imdbRoot = ' + this.z.imdbRoot, 'color:deeppink');
      if (this.z.imdbRoot) {
        let selEl = document.getElementById('rootSel');
        selEl.value = this.z.imdbRoot;
        await new Promise (z => setTimeout (z, 88));
        selEl.dispatchEvent(new Event('change'));
        await new Promise (z => setTimeout (z, 888));
      }

    } else {
      document.getElementById('logInError').style.display = '';
      await new Promise (z => setTimeout (z, 5222)); // logIn error message
      document.getElementById('logInError').style.display = 'none';
    }
  }

  // Clear input field: user or password
  clearInput = (inputClass) => {
    let elem = document.querySelector('input.' + inputClass);
    elem.value = '';
    elem.focus({ focusVisible: true });
  }

  // Detect login Enter key
   detectLogInEnter = (e) => {
    e.stopPropagation();
    if (e.keyCode === 13) { // Enter key
      this.logIn();
    }
  }

  // Detect closing Esc key and handle dialog
  detectEscClose = (e) => {
    e.stopPropagation();
    if (e.keyCode === 27) { // Esc key
      this.z.closeDialog(dialogLoginId);
    }
  }

  // Detect closing click outside a dialog-draggable modal dialog
  detectClickOutside = (e) => {
    e.stopPropagation();
    // this.z.loli(navigator.userAgent);
    if (!navigator.userAgent.includes("Firefox")) return; // Only Firefox can do this
    let tgt = e.target.id;
    if (tgt === dialogLoginId || tgt === dialogRightsId ) {
      // Outside a modal dialog, else not!
      this.z.closeDialog(tgt);
    }
  }

  // Format allowances for dialogRights
  get allowances() {
    let text = this.z.allowances.split(LF);
      // console.log(this.z.allowvalue);
    let av = this.z.allowvalue.replace(/0/g, '.').replace(/1/g, 'x');
      // console.log(av);
      // console.log(this.z.allowText);
    var add = this.z.allowText;
      // console.log(add);
    text[1] +=  this.intl.t('allowed');
    let j = 2;
    for (let i=0;i<add.length;i++) {
      text[j] += av[i] + ' ' + (i + 1) + ' = ' + add[i];
      j++;
    }
    return text.join(LF);
  }

  // Make an allowvalue array for dialogRights
  allowvalues = () => {
    return this.z.allowvalue.split('');
  }

  <template>
    <div style="display:flex" {{on 'keydown' this.detectEscClose}} {{on 'click' this.detectClickOutside}}>

      <dialog id="dialogLogin" draggable="false" ondragstart="return false">
        <header data-dialog-draggable>
          <div style="width:99%">
            <p>{{t 'dialog.login.header'}}<span>{{null}}</span></p>
          </div>{{null}}<div>
            <button class="close" type="button" {{on 'click' (fn this.z.toggleDialog dialogLoginId)}}>×</button>
          </div>
        </header>
        <main style="text-align:center">
          <form>
            <p style="margin:1rem">
              {{t 'dialog.login.text1'}} <span>{{this.z.userName}}</span>
              {{t 'with'}} [<span>{{this.z.userStatus}}</span>]-{{t 'rights'}}.
              <br>
              {{t 'dialog.login.text2'}}
              <br>
              ({{t 'dialog.login.text3'}}: {{this.z.freeUsers}}):
            </p>
            <div class="show-inline" style="text-align:right;width:fit-content">
              {{t 'dialog.login.user'}}:
              <input class="user_" size="12" title={{t 'dialog.login.name'}} placeholder={{t 'dialog.login.name'}} type="text" {{on 'keydown' this.detectLogInEnter}}><a title={{t 'erase'}} {{on 'click' (fn this.clearInput 'user_')}}> ×&nbsp;</a>
              <br>
              {{t 'dialog.login.password'}}:
              <input class="password_" size="12" title={{t 'dialog.login.password'}} placeholder={{t 'dialog.login.password'}} type="password" {{on 'keydown' this.detectLogInEnter}}><a title={{t 'erase'}} {{on 'click' (fn this.clearInput 'password_')}}> ×&nbsp;</a>
            </div>
            <p id="logInError" style="margin:1rem 1rem 0;color:red;font-weight:bold;display:none">
              {{t 'dialog.login.error'}}
            </p>
          </form>
          <br>
        </main>
        <footer data-dialog-draggable>
          <button type="button" {{on 'click' (fn this.z.openModalDialog dialogRightsId 0)}}>{{t 'button.rights'}}</button>&nbsp;
          <button type="submit" autofocus {{on 'click' (fn this.logIn)}}>{{t 'button.login'}}</button>&nbsp;
          <button type="button" {{on 'click' (fn this.z.closeDialog dialogLoginId)}}>{{t 'button.close'}}</button>&nbsp;
        </footer>
      </dialog>

      <dialog id="dialogRights" draggable="false" ondragstart="return false">
        <header data-dialog-draggable>
          <div style="width:99%">
            <p>{{t 'dialog.rights.header'}}<span></span></p>
          </div><div>
            <button class="close" type="button" {{on 'click' (fn this.z.closeDialog dialogRightsId)}}>×</button>
          </div>
        </header>
        <main style="text-align:center;padding:0 0.25rem 0 0.25rem">
          <p info="Partly copied from dialogLogin">
            {{t 'dialog.login.text1'}} <span>{{this.z.userName}}</span>
            {{t 'with'}} [<span>{{this.z.userStatus}}</span>]-{{t 'rights'}}.
            {{t 'dialog.rights.text0'}}
          </p>
          <p style="text-align:left;font-size:85%">
            <pre info="PRE keeps line feeds" style="font-family:'Andale Mono','Cascadia Mono',mono;font-size:97%;margin:0">{{this.allowances}}</pre>{{t 'dialog.rights.footnote1'}}<br>{{t 'dialog.rights.footnote2'}}
            <br>{{t 'dialog.rights.footnote3'}}<br>
          </p>
          <p style="text-align:left;font-size:85%;font-weight:bold">
            {{t 'dialog.rights.text1'}}<br>{{t 'dialog.rights.text2'}}<br>{{t 'dialog.rights.text3'}}<br>{{t 'dialog.rights.text4'}}<br>
          </p>
        </main>
        <footer data-dialog-draggable>
          <button type="button" {{on 'click' (fn this.z.closeDialog dialogRightsId)}}>{{t 'button.close'}}</button>&nbsp;
        </footer>
      </dialog>

    </div>
  </template>
}
