/*  Author: Mahadi Abuhuraira
    contact: mamt4real@gmail.com 08064241674
    github: @mamt4real
    start-date: june,2021
 */

import Player, {files, AIplayer} from "./player.js";


//declare global variables
var black;
var white;
var whiteTurn;
var from;
var to;
var availableMoves;
var pieceImg;
var undoStarted;
var whiteUndoCount;
var blackUndoCount;
var whiteTime;
var blackTime;
var timeId;
var autoM = false;
var difficulty = "easy";

//assign each of the module function to window functions for easy referencing from html file
[undoMove,showMenu,hideMenu,
showHelp,hideHelp,setDifficulty,
activateAuto,setGameTime,showThreatMap,
clickMe,initialise
].forEach(fxn => window[fxn.name] = fxn);

drawBoard();
initialise();

//reset or initialisation function
function initialise(){
    //movement variables
    black = new Player({
        "a1":"Rl","h1":"Rr",
        "b1":"Nl","g1":"Nr",
        "c1":"Bl","f1":"Br",
        "d1":"Q","e1":"K",
        "a2":"P1","h2":"P8",
        "b2":"P2","g2":"P7",
        "c2":"P3","f2":"P6",
        "d2":"P4","e2":"P5"
    },"black");
    white = new Player({
        "a8":"Rl","h8":"Rr",
        "b8":"Nl","g8":"Nr",
        "c8":"Bl","f8":"Br",
        "d8":"Q","e8":"K",
        "a7":"P1","h7":"P8",
        "b7":"P2","g7":"P7",
        "c7":"P3","f7":"P6",
        "d7":"P4","e7":"P5"
    },"white"); 
    whiteTurn = true;
    from = null;
    availableMoves = [];
    to = null;

    //undoMove controls: each player has a max of 2 per game
    undoStarted = false;
    whiteUndoCount = 2;
    blackUndoCount = 2;

    //Timer control variables: default 5 minutes
    whiteTime = 0;
    blackTime = 0;
    clearInterval(timeId);
    //timeId = setInterval(updateTime,1000);
    
    document.getElementById("white-collector").innerHTML = "";
    document.getElementById("black-collector").innerHTML = "";
    document.getElementById("Error-Indicator").innerText = "";
    document.getElementById("white_score").innerText = 0;
    document.getElementById("black_score").innerText = 0;
    document.getElementById("white-time").innerText = "00:00";
    document.getElementById("black-time").innerText = "00:00";

    //Single Player settings
    if(autoM){
        black = new AIplayer(black.pieces,black.name,difficulty);
        document.getElementById("mode-head").innerText = "Single Player (" + difficulty + ")";
    }

    placePiecesOnBoard();
}
function clickMe(id, animateMovement = true,newParent = null){
    let player = whiteTurn?white:black;
    let opponent =  whiteTurn?black:white;
    let invalid = !isValidClick(id,player,opponent);
    if(invalid){
        //invalid move: display error message
        let errorMessage = "";
        if(from == null)
            errorMessage = "Please Select your piece !"
        else{
            if(player.inCheck)
                errorMessage = "oops your king is under threat!";
            else
                errorMessage = "Invalid Move";
        }
        document.getElementById("Error-Indicator").innerText = errorMessage;
        
        return;
    }
    if(from == null || from == id){        
        if(from == null){
            availableMoves = player.getValidMovesOf(id,opponent,true);
            from = id;
        }else{
            from = null;
        }
        //reset previous highlight if its triggered from clicking
        if(animateMovement){
            highlightTiles([id]," pressed");
            highlightTiles(availableMoves);
        }
        
    }else{
        to = "#" + id;
        player.makeTheMove(from,id,opponent);
        let garbageColector = whiteTurn?"#white-collector":"#black-collector";
        let catchedImageSelector = "";
        let temp = document.querySelector(to + " img");
        //first 'if' check for normal catch while the 'elseif' check for enpassant catch
        if(temp != null)
            catchedImageSelector = to + " img";
        else if((player.pieces[id].charAt(0) == "P") && (opponent.enpassantLiable[0]) && (opponent.enpassantLiable[2] == id)){
            catchedImageSelector = "#" + opponent.enpassantLiable[3] + " img";
            temp = document.querySelector(catchedImageSelector);
        } 
        //catch animated movement, happens if there is either a normal catch or an enpassant catch
        if(temp != null){
            temp.style.width = "42px";
            temp.style.height = "42px";
            moveAnimate(catchedImageSelector,garbageColector);
        }
        //normal animated movement, happens if clickMe is not invoked by drag and drop listeners not drag and drop
        if(animateMovement){
            moveAnimate("#" + from + " img",to);
            highlightTiles([from]);
            highlightTiles(availableMoves);
        }else{//clickMe invoked by drag and drop
            newParent.append(pieceImg);
        }
        //check for castling
        if(player.pieces[id] == "K"){
            let determiNant = files.indexOf(from.charAt(0)) - files.indexOf(id.charAt(0));
            let rank = from.charAt(1);
            let castle = Math.abs(determiNant) == 2;
            if(castle){
                let rooKfrom = "#" + (determiNant == 2?"a":"h")+rank + " img";
                let rookTo = "#" + (determiNant == 2?"d":"f")+rank;
                moveAnimate(rooKfrom,rookTo);
            }

        }     
        //check for possible promotion of Pawn
        if(player.pieces[id].charAt(0) == "P"){
            let rank = whiteTurn?1:8;
            if(id.charAt(1) == rank){
                promotePiece(id,player);
                player.movesRecord[player.movesRecord.length - 1][5] = true;
            }
        }
        from = null;
        whiteTurn = !whiteTurn;
        undoStarted = false;
        updateTexts();
        let win = checkWin();
        if(!win)
        if(autoM && (opponent instanceof AIplayer))
            setTimeout(autoMove,0);
    }
}

function autoMove(){
    let player = whiteTurn?white:black;
    let opponent = whiteTurn?black:white
    let move = player.getNextMove(opponent);
    clickMe(move[0]);
    clickMe(move[1]);
}
function highlightTiles(tiles,newClass = " highlight"){
    if(tiles.length == 0)
        return;
    let determiNant = document.getElementById(tiles[0]).className;
    if(determiNant.endsWith("glow")){
        let kingPos = (whiteTurn?white:black).getKingPosition();
        //if its not a king under check...
        if(tiles[0] != kingPos)
            document.getElementById(tiles[0]).className = "tiles";
        return;
    }
    let classN  = determiNant == "tiles"?"tiles" + newClass:"tiles";
    tiles.forEach(element => {
        let node = document.getElementById(element);
        if(node != null)
            node.className = classN;
    });
}

function showThreatMap(){
    if(whiteTurn)
        highlightTiles(black.attackSquares(white));
    else
        highlightTiles(white.attackSquares(black));
}

function isValidClick(id,player,opponent){
    if(from == null || from == id){
        if(player.isValidFrom(id))
            return true;
        else
            return false;
    }else{
        let result = availableMoves.includes(id);
        if(result)
            return true;
        else if(player.isValidFrom(id)){//player click another of his own pieces
            highlightTiles(availableMoves);
            highlightTiles([from]);
            from = id;
            availableMoves = player.getValidMovesOf(id,opponent,true);
            highlightTiles([from]," pressed");
            highlightTiles(availableMoves);
        }
        return false;
    }
}

function checkWin(){
    let player = whiteTurn?white:black;
    let opponent = whiteTurn?black:white;

    let isOver = player.getCheckMateStatus(opponent);
    if(!isOver[0]){
        let message = isOver[1]?("Checkmate !!!\n" + opponent.name + " wins!"):"Its a Stalemate";
        alert(message);
        setTimeout(initialise,5);
    }

    return !isOver[0];    
}

function promotePiece(piece,player){
    let side = (piece.charAt(0) > "d")?"r":"l";
    
    let options = {
        1:["chess-pieces/"+player.name+"-queen.png","Q"],
        2:["chess-pieces/"+player.name+"-knight.png","N"+side],
        3:["chess-pieces/"+player.name+"-bishop.png","B"+side],
        4:["chess-pieces/"+player.name+"-rook.png","R"+side]
    };
    let garbageColector = whiteTurn?"#black-collector":"#white-collector";
    let choice = 0;
    if(autoM && (player instanceof AIplayer))
        choice = player.getPromotion();
    else
        do{
            choice = parseInt(prompt("Choose the Type of Piece You wish to upgrade To:\n1: Queen\n2: Knight\n3: Bishop\n4: Rook\nenter a no b/w 1-4"));
        }while(!options.hasOwnProperty(choice));

    let sourcePiece = document.querySelector(garbageColector + " img[src = '" + options[choice][0] + "']");
    let temp = document.querySelector("#" + piece + " img")
    if(sourcePiece != null){
        temp.style.width = "42px";
        temp.style.height = "42px";
        moveAnimate("#" + piece + " img",garbageColector);
        sourcePiece.style.width = "100%";
        sourcePiece.style.height = "100%";
        moveAnimate(garbageColector + " img[src = '" + options[choice][0] + "']","#" + piece);
    }else{
        temp.setAttribute("src",options[choice][0]);
    }
    player.pieces[piece] = options[choice][1];
}

function updateTexts(){
    let turn = whiteTurn?"White Turn":"Black Turn";
    let x = whiteTurn?whiteUndoCount:blackUndoCount;
    let player = whiteTurn?white:black;
    document.getElementById("Turn-indicator").innerText = turn;
    document.getElementById("undo-count").innerText = x + " left";
    document.getElementById("Error-Indicator").innerText = "Move Count: " + player.totalMoves();
    document.getElementById("white_score").innerText = white.score;
    document.getElementById("black_score").innerText = black.score;
}

function moveAnimate(element, newParent){
    //Allow passing in either a jQuery object or selector
    element = $(element + ":first");
    newParent= $(newParent)    
    var oldOffset = element.offset();
    element.appendTo(newParent);
    var newOffset = element.offset();
    
    var temp = element.clone().appendTo('body');
    temp.css({
        'position': 'absolute',
        'width':"48px",
        "height":"48px",
        'left': oldOffset.left,
        'top': oldOffset.top,
        'z-index': 1
    });
    element.hide();
    temp.animate({'top': newOffset.top, 'left': newOffset.left}, 'slow', function(){
       element.show();
       temp.remove();
    });
}

/*
couldn't make it as smooth as the jQuerry one...
function moveAnimate2(element, newParent){
    element = document.querySelector(element);
    newParent = document.querySelector(newParent);
    
    let temp = element.cloneNode();

    element.style.position = "absolute";
    element.style.width = "48px";
    element.style.height = "48px";
    element.style.zIndex = 1;

    //let diffX = newParent.getBoundingClientRect().left - element.getBoundingClientRect().left;
    //let diffY = newParent.getBoundingClientRect().top - element.getBoundingClientRect().top;

    let dy = diffY / 370 ;
    let dx = diffX / 370 ;

    let pos = 0;
    let id = setInterval(frame,5);

    function frame(){
        if(pos == 370){
            clearInterval(id);
            element.remove();
            newParent.append(temp);
        }else{
            pos++;
            temp.style.top = (parseFloat(temp.style.top)||0) + dy + 'px';
            temp.style.left = (parseFloat(temp.style.left)||0) + dx + 'px';
        }
    }

    
}
*/


//Drag and Drop Controls/Listeners

function dragStart(e){
    let player = whiteTurn?white:black;
    let opponent =  whiteTurn?black:white;
    this.className += 'hold';
    setTimeout(() => {this.className = 'hide'},0);
    let id = e.target.parentNode.id;
    if(isValidClick(id,player)){
        //check if there is a previous click before the drag started and clear it
        if(from != null)
            clickMe(from);
        availableMoves = player.getValidMovesOf(id,opponent,true);
        from = id;
        pieceImg = this;
    }
} 

function dragEnd(){
    this.className = '';
    from = null;
}
function dragOver(e){
    e.preventDefault();	
}
function dragEnter(e){
    e.preventDefault();
    if(availableMoves.includes(this.id)){
        this.className += ' highlight';
    }
}
function dragOut(){
    this.className = 'tiles';
}
function dragDrop(e){
    if(!this.className.endsWith("glow"))
    	this.className = 'tiles';
    clickMe(this.id,false,this);
}
//end of Drag and drop Controls


//Timer Controls
function setGameTime(){
    let mins = prompt("Enter the number of minutes you want","10");
    if(mins == null){
        hideMenu();
        return;
    }
    else
        mins = parseInt(mins);
    whiteTime = mins * 60;
    blackTime = mins * 60;
    clearInterval(timeId);
    timeId = setInterval(countDown,1000);
    hideMenu();
}
function updateTime(){
    if(whiteTurn){
        whiteTime++;
        document.getElementById("white-time").innerHTML =`${inTwoDigit(parseInt(whiteTime/60))}:${inTwoDigit(whiteTime%60)}`;
    }else{
        blackTime++;
        document.getElementById("black-time").innerHTML =`${inTwoDigit(parseInt(blackTime/60))}:${inTwoDigit(blackTime%60)}`;
    }
}

function inTwoDigit(n){
    return (n<10)?"0" + n:n;
}
function countDown(){
    if(whiteTime == 0 || blackTime == 0){
        clearInterval(timeId)
        let message = "Your time is up!\n Black wins!";
        if(blackTime==0)
            message = message.replace("Black","White");
        alert(message);
        initialise();
        
    }
    else
    if(whiteTurn){
        whiteTime--;
        document.getElementById("white-time").innerHTML =`${inTwoDigit(parseInt(whiteTime/60))}:${inTwoDigit(whiteTime%60)}`;
    }else{
        blackTime--;
        document.getElementById("black-time").innerHTML =`${inTwoDigit(parseInt(blackTime/60))}:${inTwoDigit(blackTime%60)}`;
    }   
}
//end of Timer Controls
function undoMove(){
    //avoid changing turn when there is a half way move
    if(from != null || autoM)
        return;
    let player = whiteTurn?black:white;
    let opponent = whiteTurn?white:black;
    let x = whiteTurn?blackUndoCount:whiteUndoCount;
    if(undoStarted){
        document.getElementById("Error-Indicator").innerText = "oops you can undo only once per turn!";
        return;
    }
    if(x == 0){
        document.getElementById("Error-Indicator").innerText = "oops you have used up your undo chances!";
        return;
    }
    let lastMove = player.movesRecord.pop();
    if(lastMove === undefined){
        document.getElementById("Error-Indicator").innerText = "oops you have made no moves yet!";
        return;
    }
    let garbageColector = (player.name == "white")?"#white-collector":"#black-collector";
    let imgsrc = {
        "Q":"chess-pieces/"+opponent.name+"-queen.png",
        "N":"chess-pieces/"+opponent.name+"-knight.png",
        "B":"chess-pieces/"+opponent.name+"-bishop.png",
        "R":"chess-pieces/"+opponent.name+"-rook.png",
        "P":"chess-pieces/"+opponent.name+"-pawn.png"
    };

    if(lastMove[3].startsWith("Castle")){

        let rookDest = ((lastMove[1].charAt(0) == "d")?"a":"h") + lastMove[1].charAt(1);
        let kingDest = "e" + lastMove[0].charAt(1);
        
        delete player.pieces[lastMove[0]];
        player.pieces[kingDest] = "K";

        player.pieces[rookDest] = player.pieces[lastMove[1]];
        delete player.pieces[lastMove[1]];

        moveAnimate("#" + lastMove[0] + " img", "#" + kingDest);
        moveAnimate("#" + lastMove[1] + " img", "#" + rookDest);
        player.movesCount["K"]--;

    }else{
        player.pieces[lastMove[0]] = player.pieces[lastMove[1]];
        delete player.pieces[lastMove[1]];
        moveAnimate("#" + lastMove[1] + " img", "#" + lastMove[0]);      
        //if there is a ctach
        let temp;
        if(lastMove[2]){
            temp = document.querySelector(garbageColector + " img[src = '" + imgsrc[lastMove[4].charAt(0)] + "']");
            temp.style.width = "100%";
            temp.style.height = "100%";
            let dest = lastMove[1];
            if(lastMove[3] == "Enpassant")
                dest = dest.charAt(0) + (parseInt(dest.charAt(1)) + ((player.name == "white")?1:-1));
            opponent.pieces[dest] = lastMove[4];
            moveAnimate(garbageColector + " img[src = '" + imgsrc[lastMove[4].charAt(0)] + "']", "#"+dest);
        }
        player.movesCount[player.pieces[lastMove[0]]]--;

        //if it's a promotion move
        if(lastMove[5]){
            garbageColector = (player.name == "black")?"#white-collector":"#black-collector";
            player.pieces[lastMove[0]] = "P" + (files.indexOf(lastMove[0].charAt(0)) + 1);
            temp = document.querySelector(garbageColector + " img[src='chess-pieces/"+player.name+"-pawn.png']");
            if(temp != null){
                temp.style.width = "100%";
                temp.style.height = "100%";
                temp = document.querySelector("#"+lastMove[0] + " img");
                temp.style.width = "42px";
                temp.style.height = "42px";
                moveAnimate("#"+lastMove[0] + " img",garbageColector);
                moveAnimate(garbageColector + " img[src='chess-pieces/"+player.name+"-pawn.png']","#" + lastMove[0]);
            }else
                document.querySelector("#" + lastMove[0] + " img").setAttribute("src","chess-pieces/"+player.name+"-pawn.png");
        }
    }

    if(opponent.attackSquares(player).includes(player.getKingPosition()))
        player.inCheck = true;
        
    if(player.inCheck)
        document.getElementById(player.getKingPosition()).className += " glow";
        
    if(!player.attackSquares(opponent).includes(opponent.getKingPosition()))
        opponent.inCheck = false;
        
    if(!opponent.inCheck)
        document.getElementById(opponent.getKingPosition()).className = "tiles";

    whiteTurn = !whiteTurn;
    if(whiteTurn)
        whiteUndoCount--;
    else
        blackUndoCount--;
    undoStarted = true;
    updateTexts();
}

//Menu controls
function showMenu(){
    let menu = document.getElementById("menu");
    let disp = menu.style.display;
    if(disp == ""){
        menu.style.display = "block";
    }else{
        menu.style.display = "";
    }
}
function hideMenu(){
    document.getElementById("menu").setAttribute("style","display:''");
}

function showHelp(){
    let menu = document.getElementById("menu");
    menu.style.display = "";
    let help = document.getElementById("help");
    help.style.display = "block";
}
function hideHelp(){
    let help = document.getElementById("help");
    help.style.display = "";
}

function activateAuto(val){
    autoM = val;
    if(val){
        document.getElementById("mode-head").innerText = "Single Player (" + difficulty + ")";
        document.getElementById("diff-control").style.display = "block";
    }
    else{
        document.getElementById("mode-head").innerText = "Multiplayer";
        document.getElementById("diff-control").style.display = "none";
    }
    initialise();
    hideMenu();
}

function setDifficulty(val){
    difficulty = val;
    initialise();
    hideMenu();
}
//end of menu controls


function drawBoard(){
    
    const board = document.getElementById("chess-board");
    board.innerHTML = "";
    
    let table = document.createElement("table");
    table.style.width = "100%";
    table.style.height = "100%";
    table.style.borderSpacing = "0px";
    let tr = document.createElement("tr");
    let td = document.createElement("td");
    td.setAttribute("class","tiles-td");
    tr.appendChild(td);
    for(let j=0;j<8;j++){
        let td = document.createElement("td");
        td.innerText = files[7-j]
        td.setAttribute("class","tiles-td");
        tr.appendChild(td);
    }
    td = document.createElement("td");
    td.setAttribute("class","tiles-td");
    tr.appendChild(td);
    table.appendChild(tr);
    for(let i=0;i<8;i++){
        let tr = document.createElement("tr");
        let td = document.createElement("td");
        td.setAttribute("class","tiles-td");
        td.innerHTML = `${8-i}`;
        tr.appendChild(td);
        for(let j=0;j<8;j++){
            let td = document.createElement("td")
            let b = document.createElement("button");
            b.setAttribute("class","tiles");
            b.setAttribute("id",files[j] + "" + (i + 1));
            b.setAttribute("onclick","clickMe(this.id)");

            
            //add Listeners for drag and drop
            b.addEventListener('dragover',dragOver);
	  	    b.addEventListener('dragenter',dragEnter);
	  	    b.addEventListener('dragleave',dragOut);
            b.addEventListener('drop',dragDrop);
            
            b.style.backgroundColor = ["yellow","orange"][(i+j)%2];
            td.appendChild(b);
            tr.appendChild(td);
        }
        td = document.createElement("td");
        td.innerHTML = `${i+1}`;
        td.setAttribute("class","tiles-td");
        tr.appendChild(td);
        table.appendChild(tr);
    }
    tr = document.createElement("tr");
    td = document.createElement("td");
    td.setAttribute("class","tiles-td");
    tr.appendChild(td);
    for(let j=0;j<8;j++){
        let td = document.createElement("td");
        td.innerText = files[j]
        td.setAttribute("class","tiles-td");
        tr.appendChild(td);
    }
    td = document.createElement("td");
    td.setAttribute("class","tiles-td");
    tr.appendChild(td);
    table.appendChild(tr);
    board.appendChild(table);
}

function placePiecesOnBoard (){
    document.querySelectorAll("#chess-board button").forEach(node => {node.innerHTML = "";node.className = "tiles";});
    const srcs = {
        "P":"-pawn.png","K":"-king.png","Q":"-queen.png","B":"-bishop.png","N":"-knight.png","R":"-rook.png"
    };

    [white,black].forEach(player => {
        for(const [id,type] of Object.entries(player.pieces)){
            const parent = document.getElementById(id);
            let img = document.createElement("img");
            let imgsrc = "chess-pieces/"+player.name + srcs[type.charAt(0)];
            img.setAttribute("src",imgsrc);
            //img.setAttribute("class","tiles-img");
            img.style.width = "100%";
            img.style.height = "100%";              
            img.setAttribute("draggable","true");
            img.addEventListener('dragstart',dragStart);
            img.addEventListener('dragend',dragEnd);
            parent.append(img);
        }
    });
}
