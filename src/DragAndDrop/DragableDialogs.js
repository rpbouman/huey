/**
* A utility to handle drag behavior of dialogs
* This class will install dragstart/drag/dragend eventhandlers on the body element
* In dragstart, it checks whether the dragevent source element is a dialog.
* If it is, it will initiate the dragging of the dialog element
* 
* Once this class is instantiated, the only thing that you need to do to make dialogs draggable 
* is to give them a draggable="true" attribute.
* 
*/

class DragableDialogs {
  
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
    dom.addEventListener('dragover', this.#handleDrag.bind(this));
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
    if (event.eventPhase !== Event.BUBBLING_PHASE){
      return;
    }
    var dialog = event.srcElement;
    if (dialog.tagName !== 'DIALOG'){
      return;
    }
    
    var header = dialog.querySelector(':scope > header');
    if (header){
      var headerBoundingRect = header.getBoundingClientRect();
      if (
        event.x < headerBoundingRect.left || 
        event.x > headerBoundingRect.right || 
        event.y < headerBoundingRect.top || 
        event.y > headerBoundingRect.bottom
      ){
        event.preventDefault();
        return;
      }
    }

    this.#dialog = dialog;

    var boundingRect = dialog.getBoundingClientRect();
    this.#dx = event.clientX - boundingRect.x;
    this.#dy = event.clientY - boundingRect.y;
    
    var dataTransfer = event.dataTransfer;
    dataTransfer.setData('text', dialog.id);
    dataTransfer.dropEffect = dataTransfer.effectAllowed = 'move';
    dataTransfer.setDragImage(this.#dragImgEl, 0, 0);
  }

  #handleDrag(event){
    var dialog = this.#dialog;
    if (!dialog){
      event.preventDefault();
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dialog.style.left = `${event.clientX - this.#dx}px`;
    dialog.style.top = `${event.clientY - this.#dy}px`;
  }
  
  #handleDragEnd(event){
    var dialog = this.#dialog;
    if (!dialog){
      event.preventDefault();
      return;
    }
    dialog.style.left = `${event.clientX - this.#dx}px`;
    dialog.style.top = `${event.clientY - this.#dy}px`;

    this.#dialog = undefined;
  }

  getDom(){
    return document.body;
  }
}

function initDragableDialogs(){
  new DragableDialogs();
}