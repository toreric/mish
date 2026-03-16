//== Mish right vertical buttons

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';

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

  doGetFullSize = async () => {
    var fileName = this.z.allFiles[this.z.picIndex].linkto;
    // If the file name begins with e.g. 'Vbm' or 'CPR'
    // then !fileName.search(/^vbm|^cpr/i) is !0 === true:
    if (!fileName.search(/^vbm|^cpr/i) && !this.z.allow.deleteImg) {
      this.z.alertMess(this.intl.t('blockCopyright'));
      return;
    }
    document.querySelector('img.spinner').style.display = '';
    var path = this.z.imdbPath + fileName;
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
    await new Promise (z => setTimeout (z, 199));
    document.querySelector('img.spinner').style.display = 'none';
    URL.revokeObjectURL(file);

    /*/ !this.z.picName.search(/^vbm|^cpr/i) is !0 === true
    // if the file name is e.g. 'Vbm_...' or 'CPR...':
    if (!this.z.picName.search(/^vbm|^cpr/i) && !this.z.allow.deleteImg) {
      this.z.alertMess(this.intl.t('blockCopyright'));
      return;
    }
    // if (navigator.userAgent.search(/Firefox/) > -1) {
    //   this.z.alertMess(this.intl.t('blockFirefox'));
    //   return;
    // }
    document.querySelector('img.spinner').style.display = '';
    let i = this.z.picIndex;
    let f012345 = '';
    if (i > -1) f012345 = await this.z.getFullSize(this.z.allFiles[i].linkto);
    await new Promise (z => setTimeout (z, 99));
    if (f012345) {
      // var wiName = window.open ('about:blank', 'w' + f012345, 'width=916,height=600,menubar=no,popup=true,status=no,titlebar=no,toolbar=no');
      var wiName = window.open('', 'w012345', 'menubar=no,popup=true,status=no,titlebar=no,toolbar=no');
      await new Promise (z => setTimeout (z, 99));
      // wiName.document.getElementsByTagName('BODY')[0].getAttributeNode("style").value = 'margin: 0px !important;';
      // wiName.document.getElementsByTagName('BODY')[0].style.display = 'flex';
      for (let div of wiName.document.getElementsByTagName('DIV')) div.remove();
      var divObj = wiName.document.createElement('div');
      var imgObj = wiName.document.createElement('img');
      imgObj.src = f012345;
      imgObj.style.margin = '-8px';
      imgObj.style.width = 'auto';
      imgObj.style.height = 'auto';
      wiName.document.getElementsByTagName('BODY')[0].appendChild(divObj);
      divObj.appendChild(imgObj);
      divObj.style.width = '100vw';
      divObj.style.height = 'auto';
    }
    await new Promise (z => setTimeout (z, 99));
    document.querySelector('img.spinner').style.display = 'none';
    if (wiName) wiName.focus();
    else this.z.alertMess(this.intl.t('blockPopup'));
    // else this.z.alertMess('POPUP blocked by browser');*/
  }

  <template>

    {{!-- RIGHT BUTTONS without href attribute --}}
    <div class="nav_links" draggable="false"
      ondragstart="return false" style="display:none">

      {{!-- NEXT-ARROW-BUTTONS --}}
      <a class="nav_ next" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showNext true)}} title="{{t 'gonext'}}">&gt;</a> &nbsp;<br>
      <a class="nav_ prev" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showNext false)}} title="{{t 'goprev'}}">&lt;</a> &nbsp;<br>

      {{!-- CLOSE AND GO BACK TO MINIPICS:  this.z.showImage '' closes! --}}
      <a class="nav_" id="go_back" title="{{t 'gomini'}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.z.showImage '')}}> </a> &nbsp;<br>

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
      <a class="nav_" id="full_size" title="{{t 'fullSize'}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.doGetFullSize)}}> </a> &nbsp;<br>

      {{!-- PRINT doPrint  --}}
      <a class="nav_ pnav_" id="do_print" title="{{t 'printOut'}}" {{on 'click' (fn this.z.futureNotYet 'printOut')}}> </a> &nbsp;
    </div>

  </template>

}
