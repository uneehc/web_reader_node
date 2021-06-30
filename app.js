const _ = require('lodash');
const request = require('request');
const async = require('async');
const url = 'http://norvig.com/big.txt';

const webReader = () => {
    const readFile = new Promise((resolve, reject) => {
        request.get(url, (error, response, body) => {
            if (error) {
                reject(error);
            } else if (response.statusCode == 200) {
                resolve(body);
            }
        });
    });

    const getTop10Words = (file) => {
        const wordsArr = _.words(file);
        const wordRegex = new RegExp(/^[A-Za-z]+$/);
        let strObj = {},
            strObjArr = [];

        wordsArr.forEach(s => {
            if (wordRegex.test(s)) {
                if (!strObj[s]) {
                    strObj[s] = {
                        str: s,
                        count: 1
                    }
                } else {
                    strObj[s].count++
                }
            }
        });

        strObjArr = _.values(strObj).filter(o => {
            return o.count >= 10;
        });
        strObjArr = _.orderBy(strObjArr, ['count'], ['desc']);

        return _.slice(strObjArr, 0, 9);
    }

    const fetchWordDetail = (text) => new Promise((resolve, reject) => {
        const postURL = 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup';
        let params = {
                key : 'dict.1.1.20210216T114936Z.e4989dccd61b9626.373cddfbfb8a3b2ff30a03392b4e0b076f14cff9',
                text,
                lang:'en-en'
            };

        request.post({url: postURL, form: params}, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                resolve(JSON.parse(body));
            }
        });
    });

    const getSyn = (wordDef) => {
        if (_.isEmpty(wordDef)) {
            return null;
        }
        let synObjArr = wordDef.tr
            syn = _.map(synObjArr, 'text') || [];

        return syn.join(', ');
    }

    const getWordOut = (wordArr) => {
        let out = {},
            result = [];

        return new Promise((resolve, reject) => {
            if (_.isEmpty(wordArr)) {
                reject('No words found');
                return;
            }
            async.each(wordArr, (wordObj, cb) => {
                const word = wordObj.str;
                fetchWordDetail(word).then(res => {
                    const wordDef = _.isEmpty(res.def)? {} : res.def[0];
                
                    out = {
                        word: word,
                        output: {
                            count: wordObj.count,
                            pos: wordDef.pos,
                            syn: getSyn(wordDef)
                        }
                    };

                    result.push(out);
                    cb();
                }).catch(err => {
                    console.log(err);
                });
            }, err => {
                if (!err) {
                    resolve(result);    
                }
            });
          });
    }

    readFile.then(file => {
        let wordArr = getTop10Words(file);

        getWordOut(wordArr).then(res => {
            console.log('---Final output---');
            res = _.orderBy(res, wordObj => wordObj.output.count, ['desc']);
            console.log(res);
        });
    }).catch(err => {
        console.log(err);
    });
}

webReader();