const qrcode = require("qrcode-terminal");

const { Client } = require("whatsapp-web.js");
const client = new Client();

const puppeteer = require("puppeteer");

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();

client.on("message", async (message) => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: false,
      // userDataDir: "./tmp"
    });
    const page = await browser.newPage();

    page.setRequestInterception(true);
    page.on("request", async (request) => {
      if (
        request.resourceType() === "style" ||
        request.resourceType() === "image" ||
        request.resourceType() === "media" ||
        request.resourceType() === "font"
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto("https://vulms.vu.edu.pk/", { waitUntil: "networkidle0" });

    await page.evaluate(async (msg) => {
      let id = msg.split("\n");
      document.querySelector("#txtStudentID").value = id[0];
      document.querySelector("#txtPassword").value = id[1];
      await document.querySelector("#ibtnLogin").click();
    }, message.body);

    await page.waitForNavigation();
    await page.goto("https://vulms.vu.edu.pk/home.aspx", {
      waitUntil: "networkidle0",
    });

    await page.waitForSelector("span.m-topbar__userpic");

    let x = await page.evaluate(async () => {
      let a = document.querySelectorAll(
        ".col-lg-6.col-md-12.col-sm-12.col-xs-12"
      );

      let temp = [];
      Array.from(a).map((b) => {
        title = b
          .querySelector("div > a > div > div > div > h3")
          .innerHTML.toString()
          .split("<br>")[0]
          .trim();

        var thisSub = { Subject: title };

        Array.from(
          b.querySelectorAll("div > div > div > ul > li.img-container-zoom")
        ).map((c, i) => {
          if (
            i !== 3 &&
            i !== 4 &&
            i !== 5 &&
            c.querySelector(".m-badge.m-badge--danger") !== null
          ) {
            thisSub[
              ["Assignment", "GDB", "Quiz", "Activity", "TDB", "Announcement"][
                i
              ]
            ] = c.querySelector(".m-badge.m-badge--danger").innerHTML;
          }
        });
        temp.push(thisSub);
      });
      // console.log(temp)
      return temp;
    });
    var res = "───────────────────────\n";
    x.map((y) => {
      res +=
        ("*" + y.Subject + "*\n") +
        (Object.keys(y).length == 1 ? "No Activity Found\n" : "") +
        (y.Assignment ? "Assignment: " + y.Assignment + "\n" : "") +
        (y.GDB ? "GDB: " + y.GDB + "\n" : "") +
        (y.Quiz ? "Quiz: " + y.Quiz + "\n" : "") +
        "───────────────────────\n";
    });
    // console.log(res);
    client.sendMessage(message.from, res);
    await browser.close();
  } catch (error) {
    console.log(error);
    client.sendMessage(
      message.from,
      "Error occurred while processing your request. Check logs for more information."
    );
  }
});
