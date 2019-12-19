import {
  findEle,
  createSimpleTop,
  createExpander,
  moveNodeObj,
  removeNodeObj,
  insertNodeObj,
  generateNewObj,
  cloneNewObj,
  checkMoveValid,
  addParentLink,
  moveUpObj,
  moveDownObj
} from './util'
import { LEFT, RIGHT, SIDE, PRE_FINISHED, PRO_FINISHED} from './const'
let $d = document

/**
 * @namespace NodeOperation
 */
export let updateNodeStyle = function (object) {
  if (!object.style) return
  let nodeEle = findEle(object.id)
  nodeEle.style.color = object.style.color
  nodeEle.style.background = object.style.background
  nodeEle.style.fontSize = object.style.fontSize + 'px'
  nodeEle.style.fontWeight = object.style.fontWeight || 'normal'
  this.linkDiv()
}

export let updateNodeTags = function (object) {
  if (!object.tags) return
  let nodeEle = findEle(object.id)
  let tags = object.tags
  let tagsEl = nodeEle.querySelector('.tags')
  if (tagsEl) {
    tagsEl.innerHTML = tags.map(tag => `<span>${tag}</span>`).join('')
  } else {
    let tagsContainer = $d.createElement('div')
    tagsContainer.className = 'tags'
    tagsContainer.innerHTML = tags.map(tag => `<span>${tag}</span>`).join('')
    nodeEle.appendChild(tagsContainer)
  }
  this.linkDiv()
}

export let updateNodeIcons = function (object) {
  if (!object.icons) return
  let nodeEle = findEle(object.id)
  let icons = object.icons
  let iconsEl = nodeEle.querySelector('.icons')
  if (iconsEl) {
    iconsEl.innerHTML = icons.map(icon => `<span>${icon}</span>`).join('')
  } else {
    let iconsContainer = $d.createElement('span')
    iconsContainer.className = 'icons'
    iconsContainer.innerHTML = icons.map(icon => `<span>${icon}</span>`).join('')
    // fixed sequence: text -> icons -> tags
    if (nodeEle.lastChild.className === 'tags') {
      nodeEle.insertBefore(iconsContainer, nodeEle.lastChild)
    } else { nodeEle.appendChild(iconsContainer) }
  }
  this.linkDiv()
}

export let updateNodeSvgChart = function () {
  // TODO
}

/** 
 * @function
 * @instance
 * @name insertSibling
 * @memberof NodeOperation
 * @description Create a sibling node.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 * insertSibling(E('bd4313fbac40284b'))
 */
export let insertSibling = function (el,type) {
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  let nodeObj = nodeEle.nodeObj
  if (nodeObj.root === true) {
    this.addChild()
    return
  }
  let newNodeObj = generateNewObj()
  insertNodeObj(nodeObj, newNodeObj)
  addParentLink(this.nodeData)
  let t = nodeEle.parentElement
  // console.time('insertSibling_DOM')
  let grp = $d.createElement('GRP')
  let top = createSimpleTop(newNodeObj)
  grp.appendChild(top)
  let children = t.parentNode.parentNode
  if (children.className === 'box') {
    this.processPrimaryNode(grp, newNodeObj)
  }
  children.insertBefore(grp, t.parentNode.nextSibling)
  if(type === undefined){
    this.createInputDiv(top.children[0])
    this.selectNode(top.children[0])
    this.linkDiv(grp.offsetParent)
    this.inputDiv.scrollIntoViewIfNeeded()
  }else{
    this.linkDiv(grp.offsetParent)
  }
  // console.timeEnd('insertSibling_DOM')

  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'insertSibling',
      obj: newNodeObj
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'insertSibling',
      obj: newNodeObj
    })
  }
}

/** 
 * @function
 * @instance
 * @name addChild
 * @memberof NodeOperation
 * @description Create a child node.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 * addChild(E('bd4313fbac40284b'))
 */
export let addChild = function (el,topic,type) {
  console.time('addChild')
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  let nodeObj = nodeEle.nodeObj
  if (nodeObj.expanded === false) {
    console.warn('目标节点必须展开')
    return
  }
  
  let newNodeObj
  if(topic){
    nodeObj.topic = topic
    newNodeObj = cloneNewObj(nodeObj)
  }else{
    newNodeObj = generateNewObj()
  }
  nodeObj.expanded = true
  if (nodeObj.children) nodeObj.children.push(newNodeObj)
  else nodeObj.children = [newNodeObj]
  addParentLink(this.nodeData)
  let top = nodeEle.parentElement

  let grp = $d.createElement('GRP')
  let newTop = createSimpleTop(newNodeObj)
  grp.appendChild(newTop)

  if (top.tagName === 'T') {
    if (top.children[1]) {
      top.nextSibling.appendChild(grp)
    } else {
      let c = $d.createElement('children')
      c.appendChild(grp)
      top.appendChild(createExpander(true))
      top.parentElement.insertBefore(c, top.nextSibling)
    }
  } else if (top.tagName === 'ROOT') {
    this.processPrimaryNode(grp, newNodeObj)
    top.nextSibling.appendChild(grp)
  }
  if(type === undefined){
    this.createInputDiv(newTop.children[0])
    this.selectNode(newTop.children[0])
    this.linkDiv(grp.offsetParent)
    this.inputDiv.scrollIntoViewIfNeeded()
  }else{
    this.linkDiv(grp.offsetParent)
  }
  
  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'addChild',
      obj: newNodeObj
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'addChild',
      obj: newNodeObj
    })
  }
  console.timeEnd('addChild')
}
// uncertain link disappear sometimes??
// TODO while direction = SIDE, move up won't change the direction of primary node

/** 
 * @function
 * @instance
 * @name moveUpNode
 * @memberof NodeOperation
 * @description Move the target node up.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 * moveUpNode(E('bd4313fbac40284b'))
 */
export let moveUpNode = function(el,type){
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  let grp = nodeEle.parentNode.parentNode
  let obj = nodeEle.nodeObj
  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'moveUpNode',
      obj: newNodeObj
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'moveUpNode',
      obj: nodeEle.nodeObj
    })
  }
  moveUpObj(obj)
  grp.parentNode.insertBefore(grp,grp.previousSibling)
  this.linkDiv()
  nodeEle.scrollIntoViewIfNeeded()
}

/** 
 * @function
 * @instance
 * @name moveDownNode
 * @memberof NodeOperation
 * @description Move the target node down.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 * moveDownNode(E('bd4313fbac40284b'))
 */
export let moveDownNode = function(el,type){
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  let grp = nodeEle.parentNode.parentNode
  let obj = nodeEle.nodeObj
  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'moveDownNode',
      obj: newNodeObj
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'moveDownNode',
      obj: nodeEle.nodeObj
    })
  }
  moveDownObj(obj)
  if(grp.nextSibling){
    grp.parentNode.insertBefore(grp,grp.nextSibling.nextSibling)
  }else{
    grp.parentNode.prepend(grp)
  }
  this.linkDiv()
  nodeEle.scrollIntoViewIfNeeded()
}

/** 
 * @function
 * @instance
 * @name removeNode
 * @memberof NodeOperation
 * @description Remove the target node.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 * removeNode(E('bd4313fbac40284b'))
 */
export let removeNode = function (el,type) {
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'removeNode',
      obj: nodeEle.nodeObj
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'removeNode',
      obj: nodeEle.nodeObj
    })
  }
  let childrenLength = removeNodeObj(nodeEle.nodeObj)
  nodeEle = nodeEle.parentNode
  if (nodeEle.tagName === 'T') {
    if (childrenLength === 0) {
      // remove epd when children length === 0
      let parentT = nodeEle.parentNode.parentNode.previousSibling
      if (parentT.tagName !== 'ROOT') // root doesn't have epd
        parentT.children[1].remove()
      this.selectParent()
    } else {
      // select sibling automatically
      let success = this.selectPrevSibling()
      if(!success) this.selectNextSibling()
    }
    for (let prop in this.linkData) {
      // BUG should traversal all children node
      let link = this.linkData[prop]
      if (link.from === nodeEle.firstChild || link.to === nodeEle.firstChild) {
        this.removeLink(document.querySelector(`[data-linkid=${this.linkData[prop].id}]`))
      }
    }
    nodeEle.parentNode.remove()
  }
  this.linkDiv()
}



/** 
 * @function
 * @instance
 * @name pre
 * @memberof NodeOperation
 * @description 撤回
 * @param 
 * @example
 * pre()
 */
export let pre = function () {
  let element = this.preHistory.pop()
  if(!element) return
  //插入子节点
  if(element.name === 'addChild'){
    let nodeEle = findEle(element.obj.id)
    this.removeNode(nodeEle,PRE_FINISHED)
  }
  //兄弟节点
  if(element.name === 'insertSibling'){

  }
  //克隆节点
  if(element.name === 'cloneNode'){

  }

  if(element.name === 'removeNode'){
    let topic = element.obj.topic
    let parentEle = findEle(element.obj.parent.id)
    this.addChild(parentEle,topic,PRE_FINISHED)
  }

  //TODO
  if(element.name === 'moveNode'){
    let formEle = findEle(element.obj.fromObj.id)
    let toEle = findEle(element.obj.toObj.id)
    this.moveNode(toEle,formEle,PRE_FINISHED)
  }

  if(element.name === 'moveUpNode'){
    let nodeEle = findEle(element.obj.id)
    this.moveDownNode(nodeEle,PRE_FINISHED)
  }

  if(element.name === 'moveDownNode'){
    let nodeEle = findEle(element.obj.id)
    this.moveUpNode(nodeEle,PRE_FINISHED)
  }
}

/** 
 * @function
 * @instance
 * @name pro
 * @memberof NodeOperation
 * @description 重做
 * @param 
 * @example
 * pro()
 */
export let pro = function (){
  let element = this.proHistory.pop()
  if(!element) return
  //插入子节点
  if(element.name === 'addChild'){
    let nodeEle = findEle(element.obj.id)
    this.removeNode(nodeEle,PRO_FINISHED)
  }
  //兄弟节点
  if(element.name === 'insertSibling'){

  }
  //克隆节点
  if(element.name === 'cloneNode'){

  }

  if(element.name === 'removeNode'){
    let topic = element.obj.topic
    let parentEle = findEle(element.obj.parent.id)
    this.addChild(parentEle,topic,PRO_FINISHED)
  }

  //TODO
  if(element.name === 'moveNode'){
    let formEle = findEle(element.obj.fromObj.id)
    let toEle = findEle(element.obj.toObj.id)
    this.moveNode(toEle,formEle,PRO_FINISHED)
  }

  if(element.name === 'moveUpNode'){
    let nodeEle = findEle(element.obj.id)
    this.moveDownNode(nodeEle,PRO_FINISHED)
  }

  if(element.name === 'moveDownNode'){
    let nodeEle = findEle(element.obj.id)
    this.moveUpNode(nodeEle,PRO_FINISHED)
  } 
}

/** 
 * @function
 * @instance
 * @name moveNode
 * @memberof NodeOperation
 * @description Move the target node to another node (as child node).
 * @param {TargetElement} from - The target you want to move.
 * @param {TargetElement} to - The target you want to move to.
 * @example
 * moveNode(E('bd4313fbac402842'),E('bd4313fbac402839'))
 */
export let moveNode = function (from, to, type) {
  console.time('moveNode')
  let fromObj = from.nodeObj
  let toObj = to.nodeObj
  if (toObj.expanded === false) {
    console.warn('Target node must be expanded')
    return
  }
  
  if (!checkMoveValid(fromObj, toObj)) {
    console.warn('Invalid move')
    return
  }
  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'moveNode',
      obj: { fromObj, toObj }
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'moveNode',
      obj: { fromObj, toObj }
    })
  }
  console.log('======')
  moveNodeObj(fromObj, toObj)
  
  addParentLink(this.nodeData) // update parent property
  let PFrom = from.parentElement
  let PTo = to.parentElement
  if (PFrom.parentNode.parentNode.className === 'box') {
    // clear svg group of primary node
    PFrom.parentNode.lastChild.remove()
  } else if (PFrom.parentNode.className === 'box') {
    PFrom.style.cssText = '' // clear style
  }
  if (PTo.tagName === 'T') {
    if (PFrom.parentNode.parentNode.className === 'box') {
      // clear direaction class of primary node
      PFrom.parentNode.className = ''
    }
    if (PTo.children[1]) {
      // expander exist
      PTo.nextSibling.appendChild(PFrom.parentNode)
    } else {
      // expander not exist, no child
      let c = $d.createElement('children')
      c.appendChild(PFrom.parentNode)
      PTo.appendChild(createExpander(true))
      PTo.parentElement.insertBefore(c, PTo.nextSibling)
    }
  } else if (PTo.tagName === 'ROOT') {
    this.processPrimaryNode(PFrom.parentNode, fromObj)
    PTo.nextSibling.appendChild(PFrom.parentNode)
  }
  this.linkDiv()
  console.timeEnd('moveNode')
}

/** 
 * @function
 * @instance
 * @name beginEdit
 * @memberof NodeOperation
 * @description Begin to edit the target node.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 * beginEdit(E('bd4313fbac40284b'))
 */
export let beginEdit = function(el) {
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  this.createInputDiv(nodeEle)
}

// Judge L or R
export function processPrimaryNode(primaryNode, obj) {
  if (this.direction === LEFT) {
    primaryNode.className = 'left-side'
  } else if (this.direction === RIGHT) {
    primaryNode.className = 'right-side'
  } else if (this.direction === SIDE) {
    let l = $d.querySelectorAll('.left-side').length
    let r = $d.querySelectorAll('.right-side').length
    if (l <= r) {
      primaryNode.className = 'left-side'
      obj.direction = LEFT
    } else {
      primaryNode.className = 'right-side'
      obj.direction = RIGHT
    }
  }
}


/** 
 * @function
 * @instance
 * @name cloneNode
 * @memberof NodeOperation
 * @description Remove the target node.
 * @param {TargetElement} el - Target element return by E('...'), default value: currentTarget.
 * @example
 */
export let cloneNode = function (el,type) {
  let nodeEle = el || this.currentNode
  if (!nodeEle) return
  let nodeObj = nodeEle.nodeObj
  if (nodeObj.root === true) {
    this.addChild()
    return
  }
  let newNodeObj = cloneNewObj(nodeObj)
  insertNodeObj(nodeObj, newNodeObj)
  addParentLink(this.nodeData)
  let t = nodeEle.parentElement
  let grp = $d.createElement('GRP')
  let top = createSimpleTop(newNodeObj)
  grp.appendChild(top)
  let children = t.parentNode.parentNode
  if (children.className === 'box') {
    this.processPrimaryNode(grp, newNodeObj)
  }
  children.insertBefore(grp, t.parentNode.nextSibling)
  if(type === undefined){
    this.createInputDiv(newTop.children[0])
    this.selectNode(newTop.children[0])
    this.linkDiv(grp.offsetParent)
    this.inputDiv.scrollIntoViewIfNeeded()
  }else{
    this.linkDiv(grp.offsetParent)
  }
  if(type === undefined || type === PRO_FINISHED){
    this.bus.fire('pre', {
      name: 'cloneNode',
      obj: newNodeObj
    })
  }
  if(type === PRE_FINISHED){
    this.bus.fire('pro', {
      name: 'cloneNode',
      obj: newNodeObj
    })
  }
  
}
