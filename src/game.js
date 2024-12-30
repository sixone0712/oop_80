class Block {
  // 블록은 여러개 생성되므로 클래스
  // 자신만의 타입을 갖는다.
  // 타입에 따른 이미지 경로를 반환한다.
  #type;

  constructor(type) {
    this.#type = type;
  }

  get image() {
    return `url(/images/${this.#type}.png)`;
  }

  get type() {
    return this.#type;
  }
}

Block.GET = (type = parseInt(Math.random() * 5)) => new Block(type);

const Game = (() => {
  // 초기화 - 필요한 정보를 바탕으로 게임본체를 생성한다 -> 함수 하나 노출하면 됨
  // 렌더 - 그림을 갱신함 -> 내부에서만 사용
  // 이벤트관련 : 각 블록에서 이번트 처리함 -> 내부에서만 사용

  const column = 8,
    row = 8,
    blockSize = 80;
  const data = [];
  let table;

  const createEle = (tag) => document.createElement(tag);
  const render = () => {
    table.innerHTML = "";
    data.forEach((row) => {
      table.appendChild(
        // row 전체를 tr로 생성, row의 column을 td로 생성하여 tr에 추가
        row.reduce((tr, block) => {
          const td = createEle("td");
          td.style.backgroundImage = block?.image ?? "";
          td.style.width = `${blockSize}px`;
          td.style.height = `${blockSize}px`;
          td.style.cursor = "pointer";
          tr.appendChild(td);
          return tr;
        }, createEle("tr"))
      );
    });
  };

  let isDown = false;
  let startBlock = null;
  let currBlock = null;
  const selected = [];

  const getBlock = (x, y) => {
    const {
      top: START_Y,
      left: START_X,
      bottom: END_Y,
      right: END_X,
    } = table.getBoundingClientRect();

    // if (x < START_X || x > START_X + column * blockSize || y < START_Y || y > START_Y + row * blockSize) {
    //   return null;
    // }
    if (x < START_X || x > END_X || y < START_Y || y > END_Y) {
      return null;
    }

    const yIndex = Math.floor((y - START_Y) / blockSize);
    const xIndex = Math.floor((x - START_X) / blockSize);

    return data[yIndex][xIndex];
  };

  const down = ({ pageX, pageY }) => {
    // down된 상태를 활성
    // x, y로 부터 block데이터를 얻음
    // 위에서 얻은 블록을 시작블록, 현재블록으로 설정하고 선택목록에 포함시킴
    if (isDown) {
      return;
    }

    const curr = getBlock(pageX, pageY);
    if (!curr) {
      return;
    }

    isDown = true;
    selected.length = 0;
    selected[0] = startBlock = currBlock = curr;

    render();
  };

  const isNext = (curr) => {
    let prevRowIdx,
      prevColIdx,
      currRowIdx,
      currColIdx,
      cnt = 0;

    data.some((row, rowIndex) => {
      let columnIndex;
      if ((columnIndex = row.indexOf(currBlock)) !== -1) {
        // 이전 블록의 index를 저장
        prevRowIdx = rowIndex;
        prevColIdx = columnIndex;
        cnt++;
      }
      if ((columnIndex = row.indexOf(curr)) !== -1) {
        // 현재 블록의 index를 저장
        currRowIdx = rowIndex;
        currColIdx = columnIndex;
        cnt++;
      }
      return cnt === 2;
    });

    // 이전 블록과 현재 블록이 같으면 인접하지 않음
    if (curr === currBlock) {
      return false;
    }

    // 이전 블록과 현재 블록이 인접하면 row나 column의 차이가 1이어야 함
    return (
      Math.abs(prevRowIdx - currRowIdx) === 1 ||
      Math.abs(prevColIdx - currColIdx) === 1
    );
  };

  const move = ({ pageX, pageY }) => {
    // isDown이 true가 아니라면 이탈
    // x, y 위치의 블록을 얻음
    // 블록의 타입이 같고 인접되어 있는 지 검사
    // 위에서 얻은 블록이 선택목록에 없으면 추가
    // 있다면 전전 블록 일 경우에는 하나 삭제

    if (!isDown) {
      return;
    }

    const curr = getBlock(pageX, pageY);
    if (!curr) {
      return;
    }

    if (curr.type !== startBlock.type || !isNext(curr)) {
      return;
    }

    if (!selected.includes(curr)) {
      selected.push(curr);
    } else if (selected[selected.length - 2] === curr) {
      // 현재 블록이 선택목록의 전전 블록일 경우 마지막에 추가된 블록 하나 삭제
      // 이 로직이 추가하는 것보다 먼저 되어야 할 것 같은데.....
      selected.pop();
    }

    currBlock = curr;
    render();
  };

  const reset = () => {
    startBlock = currBlock = null;
    selected.length = 0;
    render();
  };

  const remove = () => {
    // data에서 선택목록에 있는 블록을 삭제
    data.forEach((row) => {
      let removeIdx;
      selected.forEach((block) => {
        if ((removeIdx = row.indexOf(block)) !== -1) {
          row[removeIdx] = null;
        }
      });
    });

    isDown = false;
    render();
    setTimeout(drop, 300);
  };

  const drop = () => {
    let isNext = false;

    for (let colIdx = 0; colIdx < column; colIdx++) {
      // 가장 밑에있는 열부터 탐색하여 비어있는 값을 찾아야 함
      for (let rowIdx = row - 1; rowIdx > -1; rowIdx--) {
        // i가 0인 경우에는 맨 위에있는 블록이므로 위에서 떨어질 블록이 없음
        if (data[rowIdx][colIdx] === null && rowIdx) {
          // 현재 열의 모든 행이 비어있는 경우는 건너 뜀
          let innerRowIdx = rowIdx,
            isEmpty = true;
          while (innerRowIdx--) {
            if (data[innerRowIdx][colIdx]) {
              isEmpty = false;
              break;
            }
          }
          if (isEmpty) {
            break;
          }

          // 현재 열의 비어있는 행이 있는 경우
          isNext = true;
          while (rowIdx--) {
            // 한 칸씩 아래로 이동
            data[rowIdx + 1][colIdx] = data[rowIdx][colIdx];
            data[rowIdx][colIdx] = null;
          }
          break;
        }
      }
    }
    render();

    if (isNext) {
      setTimeout(drop, 300);
      return;
    }

    readyToFill();
  };

  const fills = [];
  let filledCnt = 0;
  const readyToFill = () => {
    // 비어있는 블럭을 새로운 블록으로 채우고 비어있지 않는 블럭을 null로 만들어서
    // 현재, data에 비어있는 행을 한칸씩 채울 수 있는 데이터를 생성한다.
    // 따라서, 위에서 부터 만든다. 데이터가 있는 부분은 만들지 않아도 된다. 비어있는 행의 최대 높이 만큼만
    // 한 칸씩 이동되면서 채워진다.

    fills.length = 0;
    data.some((row) => {
      // 비어있지 않는 행이 없는 경우 종료
      if (row.indexOf(null) === -1) {
        return true;
      }

      // 현재 비어 있는 행이 있는 경우

      // 모든 행을 null
      const fillRow = [...row].fill(null);
      fills.push(fillRow);

      // 비어있는 블록은 새로운 블록으로 채움
      row.forEach((block, idx) => {
        if (block === null) {
          fillRow[idx] = Block.GET();
        }
      });

      filledCnt = 0;
      setTimeout(fill, 300);
    });
  };

  const fill = () => {
    if (filledCnt > fills.length) {
      isDown = false;
      return;
    }

    for (let i = 0; i < filledCnt; i++) {
      fills[fills.length - i - 1].forEach((block, idx) => {
        if (block) {
          data[filledCnt - i - 1][idx] = block;
        }
      });
    }

    filledCnt++;
    render();
    setTimeout(fill, 300);
  };

  const up = () => {
    // isDown을 false로 설정
    // 선택목록이 3이상이면 삭제 실시
    // 2이하면 리셋

    return selected.length > 2 ? remove() : reset();
  };

  return (tableId) => {
    table = document.querySelector(tableId);
    for (let i = 0; i < row; i++) {
      const newRow = [];
      data.push(newRow);
      for (let j = 0; j < column; j++) {
        // newRow[j] = Block.GET();
        newRow.push(Block.GET());
      }

      // 테이블에 이벤트를 추가
      table.addEventListener("mousedown", down);
      table.addEventListener("mouseup", up);
      table.addEventListener("mouseleave", up);
      table.addEventListener("mousemove", move);
    }

    render();
  };
})();

export default Game;
