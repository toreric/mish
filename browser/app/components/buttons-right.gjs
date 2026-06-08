//== Mish right vertical buttons

import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';
import { getPromiseState } from 'reactiveweb/get-promise-state';

// Right buttons, most without href attribute
export class ButtonsRight extends Component {
  @service('common-storage') z;
  @service intl;

  toggleNavInfo = () => {
    if (document.querySelector('.toggleNavInfo').style.opacity === '0') {
      document.querySelector('.toggleNavInfo').style.opacity = '1';
    } else {
      document.querySelector('.toggleNavInfo').style.opacity = '0';
    }
  }

  // @cached
  // get getFullSize() {
  // getFullSize = () => {
  //   getPromiseState(this.doGetFullSize());
  // }
  doGetFullSize = async () => {
    if (this.z.picIndex < 0) return;
    if (!this.z.allFiles) return;
    var tempDir = false
    var fileName = this.z.allFiles[this.z.picIndex].linkto;

    // If the file name begins with e.g. 'Vbm' or 'CPR'
    // then !fileName.search(/^vbm|^cpr/i) is !0 === true:
    if (!fileName.replace(/.*\/([^/]+)$/, "$1").search(/^vbm|^cpr/i) && !this.z.allow.deleteImg) {
      this.z.alertMess(this.intl.t('blockCopyright'));
      return;
    }

    this.z.loli('Fullsize generation of ' + this.z.picName);
    document.querySelector('img.spinner').style.display = '';
    var oldFileName = fileName;
    // Convert tiff files to jpeg in a temporary directory
    if ( /\.tiff?$/i.test(fileName.replace(/.*(\.[^.]+)$/, "$1")) ) {
      fileName = '/' + this.z.picFound + '/012345.jpeg'; // Use picFound as temp dir
      tempDir = true;
      let cmd = 'convert ' + this.z.imdbPath + oldFileName +' '+ this.z.imdbPath + fileName;
      let tmp = await this.z.execute(cmd);
      // console.log('Convert output =', tmp) // <empty string> !
    }
      // this.z.loli('doGetFullSize fileName: ' + oldFileName + ':' + fileName, 'color:yellow');

    var path = this.z.imdbPath + fileName;
      // this.z.loli('doGetFullSize path: ' + path, 'color:yellow');

    await new Promise (z => setTimeout (z, 999)); // in doGetFullSize
    let file = await fetch(path).then(r => r.blob()).then(blobFile => new File([blobFile],  fileName, { type: blobFile.type, lastModified: blobFile.lastModified }));
    var url = URL.createObjectURL(file);
    var wiName = window.open('', 'w012345', 'menubar=no,popup=true,status=no,titlebar=no,toolbar=no');
    for (let div of wiName.document.getElementsByTagName('DIV')) div.remove();
    var divObj = wiName.document.createElement('div');
    var imgObj = wiName.document.createElement('img');
    imgObj.src = url;

    imgObj.style.margin = '-8px';
    imgObj.style.width = 'auto';
    imgObj.style.height = 'auto';
    wiName.document.getElementsByTagName('BODY')[0].appendChild(divObj);
    divObj.appendChild(imgObj);
    divObj.style.width = '100vw';
    divObj.style.height = 'auto';
    await new Promise (z => setTimeout (z, 199)); // in doGetFullSize
    document.querySelector('img.spinner').style.display = 'none';
    URL.revokeObjectURL(file);
    if (tempDir) await this.z.execute('rm -f ' + path);
  }

  // ButtonsRight
  <template>

    {{!-- RIGHT BUTTONS without href attribute --}}
    <div class="nav_links" draggable="false"
      ondragstart="return false" style="display:none">

      {{!-- NEXT-ARROW-BUTTONS --}}
      <a class="nav_ next" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showNext true)}} title="{{t 'gonext'}}">&gt;</a> &nbsp;<br>
      <a class="nav_ prev" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showNext false)}} title="{{t 'goprev'}}">&lt;</a> &nbsp;<br>

      {{!-- CLOSE AND GO BACK TO MINIPICS:  this.z.showImage '§close§' closes! --}}
      <a class="nav_" id="go_back" title="{{t 'gomini'}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showImage '§close§')}}> </a> &nbsp;<br>

      {{!-- HIDE or SHOW caption texts --}}
      <a class="nav_" id="togg_text" title="{{t 'toggtext'}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.toggleText)}}> </a> &nbsp;<br>

      {{!-- HELP question mark --}}
      <a class="nav_ qnav_" draggable="false" {{on 'click' (fn this.toggleNavInfo)}}>?</a> &nbsp;<br>

      {{!-- AUTO-SLIDE-SHOW SELECT
      <a class="nav_ toggleAuto" draggable="false" ondragstart="return false" {{action 'toggleAuto'}} style="font-size:1.2em;font-family:monospace" title="Automatiskt
    bildbyte [A]">AUTO</a><br>
      <!-- AUTO-SLIDE-SHOW SPEED SELECT -->
      <span class="nav_" id="showSpeed" draggable="false" ondragstart="return false">
        <input class="showTime" type="number" min="1" max="99" value="2" title="Välj tid > 0 s">s&nbsp;&nbsp;<br>
        <!-- CHOOSE AUTO-SHOW s/texline OR s/slide -->
        <a class="speedBase nav_" {{action 'speedBase'}} title="Välj per bild
    eller bildtextrad">&nbsp;per<br>&nbsp;text-&nbsp;<br>&nbsp;rad</a>
      </span><br> --}}

      {{!-- FULL SIZE fullSize --}}
      {{!-- <a class="nav_" id="full_size" title="{{t 'fullSize'}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.futureNotYet 'fullSize')}}> </a> &nbsp;<br> --}}
      <a class="nav_" id="full_size" title="{{t 'fullSize'}}" draggable="false" ondragstart="return false" {{on 'click' this.doGetFullSize}}> </a> &nbsp;<br>

      {{!-- PRINT doPrint  --}}
      <a class="nav_ pnav_" id="do_print" title="{{t 'printOut'}}" {{on 'click' (fn this.z.futureNotYet 'printOut')}}> </a> &nbsp;
    </div>

  </template>

}
