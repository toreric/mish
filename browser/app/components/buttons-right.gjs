//== Mish right vertical buttons

import Component from '@glimmer/component';
import { cached, tracked } from '@glimmer/tracking';
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

  fullSizeWindow = null;

  doGetFullSize = async () => {
    if (this.z.picIndex < 0) return;
    if (!this.z.allFiles) return;
    var tempDir = false;
    var fileName = this.z.allFiles[this.z.picIndex].linkto;

    // Copyright control
    // If the file name begins with e.g. 'Vbm' or 'CPR'
    // then !fileName.search(/^vbm|^cpr/i) is !0 === true:
    if (!fileName.replace(/.*\/([^/]+)$/, "$1").search(/^vbm|^cpr/i) && !this.z.allow.deleteImg) {
      this.z.alertMess(this.intl.t('blockCopyright'));
      return;
    }

    this.z.loli('Fullsize generation of ' + this.z.picName);
    document.querySelector('img.spinner').style.display = '';

    const ensureViewer = () => { // This is a local function
      if (this.fullSizeWindow && !this.fullSizeWindow.closed) {
          return;
      }
      const w = Math.round(window.screen.width * 0.95);
      const h = Math.round(window.screen.height * 0.95);
      this.fullSizeWindow = window.open('', 'w012345', `width=${w},height=${h},popup=true,menubar=no,status=no,toolbar=no,titlebar=no`);
      this.fullSizeWindow.document.open();
      this.fullSizeWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>EMPTY</title>
          <style>
            html, body { margin: 0; padding: 0; background: #000; overflow: auto; }
            img { display: block; transform-origin: top left; width: auto; height: auto; max-width: none; max-height: none; }
            /* body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 95vw; max-height: 95vh; width: auto; height: auto; display: block; transition: transform 0.1s ease; transform-origin: center center; } */
          </style>
        </head>
        <body>
          <div><img src="" id="zoom-img" /></div>
          <script>

            const img = document.getElementById('zoom-img');
            let scale = 1;
            let fitScale = 1;

            img.onload = () => {
              fitScale = Math.min(
                window.innerWidth / img.naturalWidth,
                window.innerHeight / img.naturalHeight
              );

              scale = fitScale;
              img.style.width = img.naturalWidth * scale + "px";
              img.style.height = "auto";
            };

            window.onkeydown = (e) => {
              if (e.key === '+' || e.key === '=') scale += 0.15;
              else if (e.key === '-' || e.key === '_') scale -= 0.15;
              else if (e.key === '0') { scale = fitScale; window.scrollTo(0,0); }
              else if (e.key === '1' || e.key === ' ') scale = 1;
              scale = Math.min(Math.max(0.1, scale), 5);
              img.style.width = img.naturalWidth * scale + "px";
              img.style.height = "auto";
              e.preventDefault();
            };

            img.addEventListener('click', () => {
              scale = scale !== 1 ? 1 : 2;
              img.style.width = img.naturalWidth * scale + "px";
              img.style.height = "auto";
            });

            window.addEventListener('wheel', (e) => {
              if (!e.ctrlKey) return;
              e.preventDefault();
              scale *= (e.deltaY < 0) ? 1.1 : 0.9;
              scale = Math.min(Math.max(scale, 0.3), 5);
              img.style.width = img.naturalWidth * scale + "px";
              img.style.height = "auto";
            }, { passive: false });

            window.showImage = function(path, title) {
              document.title = title;
              img.src = path;
            };

          </script>
        </body>
        </html>
      `);
      this.fullSizeWindow.document.close();
    }

    ensureViewer();

    if (!this.fullSizeWindow) {
      this.z.alertMess(this.intl.t('popBlock'));
      return;
    }

    var oldFileName = fileName;

    // Convert tiff files to jpeg (with ImageMagick 6) into a temporary directory
    if ( /\.tiff?$/i.test(fileName.replace(/.*(\.[^.]+)$/, "$1")) ) {
      let ranName = await this.z.execute('ran4mk.js 0-9-8-7-.jpeg');
      fileName = '/' + this.z.picFound + '/' + ranName; // Use picFound
      tempDir = true;
      let cmd = 'convert ' + this.z.imdbPath + oldFileName +' '+ this.z.imdbPath + fileName + ' 2>&1';
      let tmp = await this.z.execute(cmd);
        // console.log('Convert output =', tmp); // Should be <empty string>
      await new Promise (z => setTimeout (z, 999)); // Wait for convert + write
    }

    const img = this.fullSizeWindow.document.getElementById('zoom-img');
    var path = this.z.imdbPath + fileName;
      // this.z.loli(path, 'color:deeppink')
    this.fullSizeWindow.showImage(path, this.z.picName);
    // this.fullSizeWindow.document.title = this.z.picName;
    // img.src = '';
    // img.src = path;
    // img.style.transform = 'scale(1)';
    this.fullSizeWindow.focus();

    document.querySelector('img.spinner').style.display = 'none';

    // if (tempDir) this.z.execute('rm -f ' + path).then(()=>{});
    // Wait some seconds before removing any converted 'TIFF'
    if (tempDir) {
      setTimeout(async () => { // Absolute file path
        this.z.execute('rm -f ' + path.replace(/(^.*)(.{4}$)/, '$1') + '*').then(()=>{});
      }, 10000);
    }
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
