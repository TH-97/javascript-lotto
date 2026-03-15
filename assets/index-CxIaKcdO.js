(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function pickNumberInRange(min, max, range) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  const numbers = /* @__PURE__ */ new Set();
  while (numbers.size < range) {
    const randomNumber = Math.floor(
      Math.random() * (maxFloored - minCeiled + 1) + minCeiled
    );
    numbers.add(randomNumber);
  }
  return [...numbers];
}
const Validator = {
  isInteger(value) {
    return Number.isInteger(Number(value));
  },
  isLottoNumberInRange(value) {
    return value >= 1 && value <= 45;
  },
  purchaseAmountValidator(value) {
    if (!this.isInteger(value)) {
      throw new Error("숫자만 입력해 주세요.");
    }
    if (Number(value) % 1e3 !== 0) {
      throw new Error("1000원 단위만 입력 가능합니다.");
    }
  },
  retryValidator(value) {
    if (!["y", "n"].includes(value)) {
      throw new Error("다시시작 입력은 y 또는 n 만 입력 가능합니다.");
    }
  }
};
class Lotto {
  #numbers;
  constructor(numbers) {
    this.#validate(numbers);
    this.#numbers = numbers;
  }
  #validate(numbers) {
    if (numbers.length !== 6) {
      throw new Error("로또 번호는 6개여야 합니다.");
    }
    if (new Set(numbers).size !== numbers.length) {
      throw new Error("중복 당첨 번호 입력은 불가 합니다.");
    }
    numbers.forEach((number) => {
      number = Number(number);
      if (!Validator.isInteger(number)) {
        throw new Error("당첨 번호는 숫자만 입력 가능합니다.");
      }
      if (!Validator.isLottoNumberInRange(number)) {
        throw new Error("1 ~ 45 이내 숫자만 입력 가능합니다.");
      }
    });
  }
  getLottoNumber() {
    return [...this.#numbers];
  }
}
class WinningLotto extends Lotto {
  #bonusNumber;
  constructor(numbers, bonusNumber) {
    super(numbers.map((lottoNumber) => Number(lottoNumber)));
    this.#validateBonusNumber(bonusNumber);
    this.#bonusNumber = bonusNumber;
  }
  #validateBonusNumber(bonusNumber) {
    bonusNumber = Number(bonusNumber);
    if (!Validator.isInteger(bonusNumber)) {
      throw new Error("보너스 번호는 숫자여야 합니다.");
    }
    if (!Validator.isLottoNumberInRange(bonusNumber)) {
      throw new Error("보너스 번호는 1 ~ 45 이내 숫자여야 합니다.");
    }
    if ((/* @__PURE__ */ new Set([...this.getLottoNumber(), bonusNumber])).size !== 7) {
      throw new Error("보너스 번호는 당첨 번호와 중복될 수 없습니다.");
    }
  }
  getBonusNumber() {
    return this.#bonusNumber;
  }
}
const PRIZE_LIST = [0, 2e9, 3e7, 15e5, 5e4, 5e3];
class LottoMachine {
  #amount;
  #lottos;
  #matchResult;
  constructor(amount) {
    this.#amount = amount;
    this.#lottos = Array.from(
      { length: amount / 1e3 },
      () => this.createLotto()
    );
    this.#matchResult = /* @__PURE__ */ new Map([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0]
    ]);
  }
  getLottos() {
    return this.#lottos;
  }
  getPurchaseCount() {
    return this.#lottos.length;
  }
  getMatchResult() {
    return this.#matchResult;
  }
  updateMatchResult(rank) {
    if (rank !== null) {
      const current = this.#matchResult.get(rank);
      this.#matchResult.set(rank, current + 1);
    }
  }
  getMatchRank(matchCount, isMatchBonus) {
    if (matchCount === 6) return 1;
    if (matchCount === 5 && isMatchBonus) return 2;
    if (matchCount === 5) return 3;
    if (matchCount === 4) return 4;
    if (matchCount === 3) return 5;
    return null;
  }
  calculateMatchResult(winningNumber, bonusNumber) {
    this.#lottos.forEach((lotto) => {
      const lottoNumbers = lotto.getLottoNumber();
      const matchCount = (/* @__PURE__ */ new Set([...lottoNumbers])).intersection(
        /* @__PURE__ */ new Set([...winningNumber])
      ).size;
      const isMatchBonus = lottoNumbers.includes(Number(bonusNumber));
      const rank = this.getMatchRank(matchCount, isMatchBonus);
      this.updateMatchResult(rank);
    });
  }
  getTotalPrize() {
    return this.#matchResult.keys().reduce(
      (acc, rank) => acc + PRIZE_LIST[rank] * this.#matchResult.get(rank),
      0
    );
  }
  getRateOfReturn() {
    const profitRate = this.getTotalPrize() / this.#amount * 100;
    return profitRate.toFixed(1);
  }
  createLotto() {
    return new Lotto(pickNumberInRange(1, 45, 6).sort((a, b) => a - b));
  }
}
class App {
  #input;
  #output;
  constructor(input, output) {
    this.#input = input;
    this.#output = output;
  }
  async run() {
    while (true) {
      const amount = await this.#input.reRead(this.#input.readPurchaseAmount);
      const lottoMachine = new LottoMachine(amount);
      this.#showPurchaseLotto(lottoMachine);
      const winningLotto = await this.#getWinningLotto();
      this.#showMatchResult(lottoMachine, winningLotto);
      const restart = await this.#input.reRead(this.#input.readRetry);
      if (restart === "n") break;
    }
  }
  #showPurchaseLotto(lottoMachine) {
    this.#output.printPurchaseLottoCount(lottoMachine.getPurchaseCount());
    this.#output.printLottos(lottoMachine.getLottos());
  }
  #showMatchResult(lottoMachine, winningLotto) {
    lottoMachine.calculateMatchResult(
      winningLotto.getLottoNumber(),
      winningLotto.getBonusNumber()
    );
    this.#output.printResult(
      lottoMachine.getMatchResult(),
      lottoMachine.getRateOfReturn()
    );
  }
  async #getWinningLotto() {
    const winningLottoNumber = (await this.#input.reRead(this.#input.readWinningLottoNumber)).getLottoNumber();
    const winningLotto = await this.#input.reRead(
      this.#input.readBonusNumber,
      winningLottoNumber
    );
    return winningLotto;
  }
}
const DOMInput = {
  winningLotto: null,
  async reRead(func, funcArgs) {
    while (true) {
      try {
        const answer = await func.call(this, funcArgs);
        return answer;
      } catch (err) {
        alert(`[ERROR] ${err.message}`);
      }
    }
  },
  getPurchaseInputValue() {
    return document.querySelector("#purchase-amount-input-field").value;
  },
  showLottoContainer() {
    document.querySelector("#lotto-container").style.display = "flex";
  },
  handlePurchaseSubmit(e, resolve) {
    e.preventDefault();
    const answer = this.getPurchaseInputValue();
    Validator.purchaseAmountValidator(answer);
    this.showLottoContainer();
    resolve(answer);
  },
  registerPurchaseSubmitHandler(resolve, reject) {
    document.querySelector("#purchase-amount-area").addEventListener(
      "submit",
      (e) => {
        try {
          this.handlePurchaseSubmit(e, resolve);
        } catch (err) {
          reject(err);
        }
      },
      { once: true }
    );
  },
  async readPurchaseAmount() {
    return new Promise(
      (resolve, reject) => this.registerPurchaseSubmitHandler(resolve, reject)
    );
  },
  getWinningNumbers() {
    return [...document.querySelectorAll(".winning-number")].map(
      (input) => input.value
    );
  },
  getBonusInputValue() {
    return document.querySelector("#bonus-number-input").value;
  },
  handleWinningSubmit(e, resolve) {
    e.preventDefault();
    const numbers = this.getWinningNumbers();
    const bonus = this.getBonusInputValue();
    const winningLotto = new WinningLotto(numbers, Number(bonus));
    this.winningLotto = winningLotto;
    resolve(new Lotto(numbers));
  },
  registerWinningSubmitHandler(resolve, reject) {
    document.querySelector("#winning-number-area").addEventListener(
      "submit",
      (e) => {
        try {
          this.handleWinningSubmit(e, resolve);
        } catch (err) {
          reject(err);
        }
      },
      { once: true }
    );
  },
  async readWinningLottoNumber() {
    return new Promise(
      (resolve, reject) => this.registerWinningSubmitHandler(resolve, reject)
    );
  },
  async readBonusNumber() {
    return this.winningLotto;
  },
  closeModal() {
    document.querySelector("#result-modal").close();
  },
  registerRetryHandlers(resolve) {
    document.querySelector("#modal-close-button").addEventListener(
      "click",
      () => {
        this.closeModal();
        this.registerReShowHandler(resolve);
      },
      { once: true }
    );
    document.querySelector("#restart-button").addEventListener("click", () => location.reload(), { once: true });
  },
  registerReShowHandler(resolve) {
    document.querySelector("#winning-number-area").addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        document.querySelector("#result-modal").showModal();
        this.registerRetryHandlers(resolve);
      },
      { once: true }
    );
  },
  async readRetry() {
    return new Promise((resolve) => this.registerRetryHandlers(resolve));
  }
};
const DOMOutput = {
  printPurchaseLottoCount(count) {
    document.querySelector("#purchase-amount-output").textContent = `총 ${count}개를 구매하였습니다.`;
  },
  lottoToHTML(lotto) {
    return `<li><span>🎟️ </span><output>${lotto.getLottoNumber().join(", ")}</output></li>`;
  },
  printLottos(lottos) {
    document.querySelector("#lottos").innerHTML = lottos.map((lotto) => this.lottoToHTML(lotto)).join("");
  },
  updateMatchCounts(matchResult) {
    document.querySelectorAll(".match-count").forEach((el, index) => {
      const ranks = [5, 4, 3, 2, 1];
      el.textContent = matchResult.get(ranks[index]);
    });
  },
  printResult(matchResult, rateOfReturn) {
    this.updateMatchCounts(matchResult);
    document.querySelector("#rate-of-return").textContent = rateOfReturn;
    document.querySelector("#result-modal").showModal();
  }
};
const app = new App(DOMInput, DOMOutput);
app.run();
