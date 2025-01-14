/**
* A utility to handle drag behavior of dialogs
* This class will install dragstart/drag/dragend eventhandlers on the body element
* In dragstart, it checks whether the dragevent source element is a dialog.
* If it is, it will initiate the dragging of the dialog element
*
* To do this, the dialog will first be closed, and then reopened using (non modal) open() method
* This is necessary to allow the dialog to move in response to the drag events.
* (dialogs opened with showModal() do not respond to style changes that attempt to position them by setting lef/top style properties)
* 
* Finally, at dragend, the dialog is closed again, and reopened with showModal().
*
* If your dialog is not modal, and you want to suppress the closing and reopening of the dialog,
* be sure to add a data-modal="false" attribute omm the dialog.
* 
* Once this class is instantiated, the only thing that you need to do to make dialogs draggable 
* is to give them a draggable="true" attribute.
* 
*/

class DraggableDialogs {
  
  #dialog = undefined;
  #dragImgEl = undefined;
  #dx = undefined;
  #dy = undefined;
  
  constructor(){
    this.#initDragImage();
    this.#initEvents();
  }
  
  #initEvents(){
    var dom = this.getDom();

    dom.addEventListener('dragstart', this.#handleDragStart.bind(this));
    dom.addEventListener('drag', this.#handleDrag.bind(this));
    dom.addEventListener('dragend', this.#handleDragEnd.bind(this));
  }
  
  #initDragImage(){
    this.#dragImgEl = createEl('span', {
      style: {
        position: 'absolute',
        display: 'block',
        width: '0px',
        height: '0px'
      }
    });
    var dom = this.getDom();
    dom.appendChild(this.#dragImgEl);
  }
  
  #handleDragStart(event){
    var dialog = event.srcElement;
    if (dialog.tagName !== 'DIALOG'){
      return;
    }
    
    this.#dialog = dialog;

    dialog.close();
    //dialog.style.display = 'none';
    dialog.style.zIndex = 10;
    //dialog.style.position = 'absolute';
    dialog.setAttribute('open', true);
    
    var dataTransfer = event.dataTransfer;
    dataTransfer.dropEffect = dataTransfer.effectAllowed = 'move';
    dataTransfer.setDragImage(this.#dragImgEl, 0, 0);
    
    this.#dx = event.clientX - dialog.getBoundingClientRect().x;
    this.#dy = event.clientY - dialog.getBoundingClientRect().y;
  }

  #handleDrag(event){
    var dialog = this.#dialog;
    if (!dialog){
      return;
    }
    dialog.style.left = (event.clientX - this.#dx) + 'px';
    dialog.style.top = (event.clientY - this.#dy) + 'px';
    
  }
  
  #handleDragEnd(event){
    var dialog = this.#dialog;
    if (!dialog){
      return;
    }
    dialog.close();
    dialog.style.left = (event.clientX - this.#dx) + 'px';
    dialog.style.top = (event.clientY - this.#dy) + 'px';
    dialog.showModal();

    this.#dialog = undefined;
  }

  getDom(){
    return document.body;
  }
}

function initDraggableDialogs(){
  new DraggableDialogs();
}