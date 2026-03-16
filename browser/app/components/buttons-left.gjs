//== Mish left vertical buttons

import Component from '@glimmer/component';
import { service } from '@ember/service';
import { eq } from 'ember-truth-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import t from 'ember-intl/helpers/t';

import RefreshThis from './refresh-this';

import { dialogHelpId } from './dialog-help';

// Left buttons, most without href attribute
export class ButtonsLeft extends Component {
  @service('common-storage') z;
  @service intl;

  // someFunction = (param) => {this.z.loli(param, 'color:red');}

  toggleMainMenu = async (e) => {
    if (e) e.stopPropagation();
    if (document.getElementById("menuMain").style.display === "") {
      this.z.closeMainMenu('');
    } else {
      this.z.openMainMenu();
      await new Promise (z => setTimeout (z, 22));
      this.z.setTreeMax();
    }
  }

  toggleHideFlagged = (e) => {
    if (e) e.stopPropagation();
    // If there is at least one invisible:
    if (document.querySelector('.img_mini.invisible')) {
      this.z.showHidden();
    } else {
      this.z.hideHidden();
    }
  }

  reloadAlbum = (e) => {
    if (e) e.stopPropagation();
    // this.z.hideHidden();
    this.z.openAlbum(this.z.imdbDirIndex);
  }

  toggleNameView = (e) => {
    if (e) e.stopPropagation();
      // this.z.loli(this.z.displayNames, 'color:red');
    if (this.z.displayNames === 'none') this.z.displayNames = 'block';
    else this.z.displayNames = 'none';
  }

  toggDia = async () => {
    let id = 'dialogUtil';
    this.z.albumTools = false;
    let diaObj = document.getElementById(id);
    if (diaObj.hasAttribute('open')) {
      document.getElementById(id).focus();
      this.z.closeDialog(id);
      return;
    }
    await this.z.openDialog(id);
    await new Promise (z => setTimeout (z, 322));
  }

  <template>

    {{!-- <iframe class="intro" src="start.html" style="display:none"></iframe> --}}

    {{!-- LEFT BUTTONS without href attributes --}}
    <div id="smallButtons" draggable="false" ondragstart="return false" style="z-index:10">

      <a id="menuButton" class="smBu" title-2={{t 'buttons.left.main'}} draggable="false" ondragstart="return false" {{on 'click' this.toggleMainMenu}}>&nbsp;</a>

    <div id="smallButtons1" draggable="false" ondragstart="return false" style="display:none">

      <a id="commonTools" class="smBu" title="{{t 'tools'}}" draggable="false" ondragstart="return false" {{on 'click' (fn this.toggDia)}} style="background:#444 url(/images/tools.png) center 0rem/2.2rem no-repeat"></a>

      <a id="findTxt" class="smBu" title={{t 'buttons.left.find'}} draggable="false" ondragstart="return false" {{on 'click' (fn this.z.toggleDialog 'dialogFind')}} style="background:#444 url(/images/find_icon.png) center 0.1rem/1.9rem no-repeat"></a>

      <a id="reLd" class="smBu" title={{t 'buttons.left.reload'}} draggable="false" ondragstart="return false" {{on 'click' (fn this.reloadAlbum)}} src="/images/reload.png"></a>

      <a id="toggleHide" class="smBu" title={{t 'buttons.left.hide'}} draggable="false" ondragstart="return false" style="display:none" {{on 'click' (fn this.toggleHideFlagged)}}></a>

      <a id="saveOrder" class="smBu" title={{t 'buttons.left.save'}} draggable="false" ondragstart="return false" {{on 'click' (fn this.z.saveOrder)}} style="background:#444 url(/images/floppy1.png) center 0.15rem/1.7rem no-repeat"></a>

      <a id="toggleName" class="smBu" title={{t 'buttons.left.name'}} draggable="false" ondragstart="return false" {{on 'click' (fn this.toggleNameView)}} style="display:none;background:#444 url(/images/img-name.png) center 0.44rem/1.6rem no-repeat"></a>

      <a id="questionMark" class="smBu" title={{t 'buttons.left.help'}} draggable="false" ondragstart="return false" {{on 'click' (fn this.z.toggleDialog dialogHelpId false)}}>?</a>

      <a id="arrUp" class="smBu" draggable="false" ondragstart="return false" title={{t 'buttons.left.up'}} style="background:#444 url(/images/arrow.png) center 0.2rem/1.6rem no-repeat" onclick="window.scrollTo(0,0)"></a>

    </div>
    </div>
  </template>
}
