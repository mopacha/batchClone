const request = require('request');
const fs = require('fs');
const path = require('path');
const savePath = path.join(__dirname, '../../@sarmy');
const URL = "https://xxxx/api/v4";
const TOKEN = "xxxx";
const child_process = require('child_process');
const util = require('util');
const exec = util.promisify(child_process.exec)

// 递归创建目录 同步方法
function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

async function getGroupList() {
  return new Promise((resolve, reject) => {
    request({
      url: `${URL}/groups?per_page=100`,
      method: "GET",
      headers: {
        "content-type": "application/json",
        "PRIVATE-TOKEN": TOKEN
      }
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(JSON.parse(body));
      } else {
        reject(error);
      }
    });
  });
};


async function getProjectList(groupId) {
  return new Promise((resolve, reject) => {
    request({
      url: `${URL}/groups/${groupId}/projects?per_page=300`,
      method: "GET",
      headers: {
        "content-type": "application/json",
        "PRIVATE-TOKEN": TOKEN
      }
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        resolve(JSON.parse(body));
      } else {
        resolve([]);
      }
    });
  });
};


const gitClone = async (newPath, projectName, repoUrl) => {
  try {
    // 执行clone
    console.log(`start clone ${projectName}: into ==> ${newPath} ......`);
    await exec(`sudo rm -rf ${projectName}`, { cwd: newPath });
    if (projectName === 'I18n Ui') {
      await exec(`sudo rm -rf i18n-ui`, { cwd: newPath });
    }
    await exec(`git clone ${repoUrl}`, { cwd: newPath });
    console.log(`clone ${projectName} success ^_^`);
  } catch (error) {
    throw (error);
  }
}

const gitPull = async (newPath, projectName, repoUrl) => {
  try {
    console.log(`git pull ${projectName} and path is ${newPath}`);
    await exec(`git remote prune origin`, { cwd: `${newPath}${projectName}` });
    await exec(`sudo git config pull.rebase false`, { cwd: `${newPath}${projectName}` });
    await exec(`sudo git pull`, { cwd: `${newPath}${projectName}` });
    console.log(`git pull  done ^_^`);
  } catch (error) {
    gitClone(newPath, projectName)
  }
}


const start = async () => {
  try {
    const groups = await getGroupList();
    console.log(`你有 ${groups.length} 个分组`);

    for (let i = 0, len = groups.length; i < len; i++) {
      const item = groups[i]
      const name = item.full_path;
      const groupId = item.id;
      const newPath = `${savePath}/${name}/`;

      mkdirsSync(newPath); // 创建项目组

      const projects = await getProjectList(groupId);
      if (Array.isArray(projects) && projects.length > 0) {
        for (let j = 0, len = projects.length; j < len; j++) {
          const repoUrl = projects[j].http_url_to_repo;
          const projectName = projects[j].name;
          // 如果clone 过了， 则执行git pull
          if (fs.existsSync(`${newPath}${projectName}`)) {
            await gitPull(newPath, projectName, repoUrl)
          } else {
            await gitClone(newPath, projectName, repoUrl)
          }
        }
      }
    }
  } catch (error) {
    console.log(error, 'oh is error')
  }
};


start();




