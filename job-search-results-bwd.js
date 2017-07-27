bwdval = {};
bwdCo = {};



function BWD_getAuth0Token(tokenType) {
	if (window.event) {window.event.preventDefault();}

	BWD.Config.set({
		Auth0ID: bwdval.Auth0ID
	});

	bwdval.auth0_idToken = '';
	bwdval.auth0_accessToken = '';
	
	if (PopUpTest()) {

		BWD.Auth.login(bwdval.login, bwdval.password)
		.then(function(result) {
			console.log('BWD.Auth.login() returned successfully. Results:', result);
			
			var args = {returnFormat: "JSON",
								method: "UpdateLastLogin",
								pid: $('#bwd_person_id').val()
							};
			var target = "/theme/myimpact/ig_lib/cfc/bwd.cfc";
			jQuery.getJSON(target,args);
			
			if (result.hasOwnProperty('accessToken') || result.hasOwnProperty('idToken')) {
				BWD.Config.set({
					APIEnv: bwdval.APIEnv,
					BackendEnv: bwdval.BackendEnv
				});
				if (result.hasOwnProperty('idToken') && tokenType === 'id') {
					bwdval.auth0_idToken = result.idToken;
					BWD.Config.set({
						AccessToken: {
							id_token: result.idToken
						}
					});
				}
				if (result.hasOwnProperty('accessToken')) {
					bwdval.auth0_accessToken = result.accessToken
					BWD.Config.set({
						AccessToken: {
							access_token: result.accessToken
						}
					});
				}
				//$('#bwdAuth0Status').attr('class', 'alert').addClass('alert-success').html('Successfully retrieved Auth0' + tokenType + ' token. The token will be stored for use in other methods, like for listing jobs.<br/>');
			} else {
				$('#bwdAuth0Status').attr('class', 'alert').addClass('alert-danger').text('Received response, but did not receive a valid auth0 token. Please try again.');
			}
		})
		.catch(function(error) {
			console.log('An error occurred when invoking BWD.Auth.login(). Error:', error);
			$('#bwdAuth0Status').attr('class', 'alert').addClass('alert-danger').text('An error occurred when fetching an auth0 token: ' + error.message);
		});
	}	// passed PopupTest()
	else {
		console.log("failed PopupTest");
	}
}	// function BWD_getAuth0Token

function BWD_RegisterUser() {
	if (window.event) {window.event.preventDefault();}
	
	BWD.Config.set({Auth0ID: bwdval.Auth0ID});
	//BWD.Config.set({Auth0ID: '0Yz7N29uhI2d060otOG0iRStULwP8zdM'});

	BWD.Auth.signup(bwdval.login, bwdval.password)
		.then(function(result) {
			console.log('BWD.Auth.signup() returned successfully. Results:', result);

			bwdval.auth0AccessToken = result.accessToken;
			bwdval.auth0IdToken = result.idToken;
			BWD.Config.set({
				AccessToken: {id_token: result.idToken},
				APIEnv: bwdval.APIEnv,
				BackendEnv: bwdval.BackendEnv
			});
			
			// Save to local database for future login
			var args = {returnFormat: 'JSON',
								method: 'SaveNewUser',
								pid: $('#bwd_person_id').val(),
								ln: $('#bwd_user_login').val(),
								pw: $('#bwd_user_password').val()
							};
			var target = "/theme/myimpact/ig_lib/cfc/bwd.cfc";
			jQuery.getJSON(target,args);
			
			// Register Auth0 token with BWD
			var user = {email:bwdval.login};
			BWD.Users.registerAuth0Token("JWT " + result.idToken, user)
				.then(function(result) {
					console.log("registerAuth0Token result: ",result);
					// Save user id
					var args = {returnFormat: 'JSON',
										method: 'UpdateUserID',
										pid: $('#bwd_person_id').val(),
										uid: result.data.uid
									};
					var target = "/theme/myimpact/ig_lib/cfc/bwd.cfc";
					jQuery.getJSON(target,args);
				})
				.catch(function(error) {console.log('An error occurred when invoking BWD.Users.registerAuth0Token(). Error:', error);})
		})
		.catch(function(error) {
			console.log('An error occurred when invoking BWD.Auth.signup(). Error:', error);
		});
}	// function BWD_RegisterUser

function BWD_SearchJobs(page,isSerial,format) {
  if (window.event) {window.event.preventDefault();}
	format = format || 'long';

	if (!page) {page = 1;}

	var $title_new = $('#bwd_keyword_title');
	var $title_serial = $('#bwd_cur_keyword_title');
	var $location_new = $('#bwd_location_id');
	var $location_serial = $('#bwd_cur_location_id');
	var $range_new = $('#bwd_results_range');
	var $range_serial = $('#bwd_cur_results_range');

  var query = {
    title: (isSerial) ? $title_serial.val() : $title_new.val(),
    location: (isSerial) ? $location_serial.val() : $location_new.val(),
	 range: (isSerial) ? $range_serial.val() : $range_new.val(),
	 page: page
    //jobarea: $('#jobAreaId').val()
	 //description: 'Engineer'
  };

  $search_wrap = $('#bwd_search_wrapper');
  $search_wrap.html("Searching...");
  BWD.Search.search('job',query)
    .then(function(results) {
		console.log('BWD.Search.search() returned successfully. Results: ', results);
		$title_serial.val($title_new.val());
		$location_serial.val($location_new.val());
		$range_serial.val($range_new.val());
		$search_wrap.empty();
      var totalNum = results.count;
      var num = results.data.length;
		var jobs = [];
		for (var i=0; i<results.data.length; i++) {
			jobs.push(results.data[i].id);
			$search_wrap.append('<div class="bwd_entry" id="bwd_search_job_' + results.data[i].id + '"></div>')
		}
		if (jobs.length) {
			BWD_GetJobs(jobs.join(','),'search',format);
		} else {
			$search_wrap.html("Nothing found.");
		}
		if (results.next) {
			var $nav = $('<div class="text-uppercase black-text small pagination pagination-unstyled"><a class="pointer" onclick="BWD_SearchJobs(' + String(Number(page)+1) + ',true)">Next</a></div>');
			$search_wrap.prepend($nav);
			$search_wrap.append($nav.clone());
		}
		console.log("search query: ",query);
    })
    .catch(function(error) {
      console.log('An error occurred when invoking BWD.Jobs.search(). Error: ', error);
		$search_wrap.html('');
    });
}	// function BWD_SearchJobs

function BWD_StateSort(data) {
	var state, location;
	for (var i=0; i<data.length; i++) {
		state = data[i].name.slice(-2);
		location = data[i].name.slice(0,-4);
		data[i].val = data[i].id;
		data[i].opt = state + ' -- ' + location
	}
	data.sort(function(a,b){
					if (a.opt.toLowerCase() < b.opt.toLowerCase()) {return -1;}
					else if (a.opt.toLowerCase() > b.opt.toLowerCase()) {return 1;}
					else {return 0;}
				});
	return data;
}	// function BWD_StateSort

function BWD_GetMe() {
	BWD.Users.getMe()
    .then(function(results) {
      console.log('BWD.Users.getMe() returned successfully. Results: ', results);
      var tableHtml;
      if (results.data.length) {
        var user = results.data[0];
        function isScalar(obj) {
          return (/string|number|boolean/).test(typeof obj);
        }
        function objToTable(entity, prefix) {
          var str = '';
          $.each(entity, function(key, value) {
            key = (prefix.length) ? prefix + '.' + key : key;
            if (value && !isScalar(value)) {
              str += objToTable(value, key);
              return;
            }
            str += '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
          });
          return str;
        }
        tableHtml += objToTable(user, '');
      } else {
        $('#bwdUserStatus').attr('class', 'alert').addClass('alert-warning').text('No user found.');
      }
      $('#bwdUserTableBody').html(tableHtml);
    })
    .catch(function(error) {
      console.log('An error occurred when invoking BWD.Users.getMe(). Error: ', error);
      $('#bwdUserTableBody').html('');
    });
}	// function BWD_GetMe()

function BWD_GetFeed() {
  if (window.event) {window.event.preventDefault();}

  if (!isAuthenticated()) {
    console.log('You must get an API token before you can use this method. (GetFeed)');
    return;
  }

  console.log('Loading feed...');
  var query = {range:10};

  $feed_wrap = $('#bwd_feed_wrapper');

  BWD.Feed.get(query)
    .then(function(results) {
      console.log('BWD.Feed.get() returned successfully. Results: ', results);
      if (results.data.length) {
			var jobs = [];
			var articles = [];
			for (var i=0; i<results.data.length; i++) {
				switch (results.data[i].type) {
					case "article":
						articles.push(results.data[i].id);
						$feed_wrap.append('<div class="bwd_entry" id="bwd_feed_article_' + results.data[i].id + '"></div>')
						break;
					case "job":
						jobs.push(results.data[i].id);
						$feed_wrap.append('<div class="bwd_entry" id="bwd_feed_job_' + results.data[i].id + '"></div>')
						break;
					default:
						console.log('Found unexpected type in feed: ' + results.data[i].type);
						break;
				}
			}
			if (articles.length) {BWD_GetArticles(articles.join(','),'feed');}
			if (jobs.length) {BWD_GetJobs(jobs.join(','),'feed');}
      } else {
        console.log('Feed is empty.');
      }
		if (results.previous && results.previous.href && results.previous.href.length) {
			var $nav = $('<div class="text-uppercase black-text small pagination pagination-unstyled"><a class="pointer" onclick="BWD_GoNav(this);" data-target="' + results.previous.href + '">Previous</a></div>');
			$feed_wrap.prepend($nav);
			$feed_wrap.append($nav.clone());
		} else {
			console.log("no previous feed");
		}
    })
    .catch(function(error) {
      console.log('An error occurred when invoking BWD.Feed.get(). Error: ', error);
    });
}	// function BWD_GetFeed

function BWD_GoNav(o) {
	console.log(o);
	jQuery.getJSON($(o).attr("data-target"),{},function(data) {
		console.log("data returned from nav call: ",data);
	});
}

function BWD_GetArticles(ids,action) {
	if (ids.length) {
	BWD.Articles.getById(ids)
    .then(function(results) {
      console.log('BWD.Articles.getById() returned successfully. Results: ', results);
		if (results.data.length) {
			for (var i=0; i<results.data.length; i++) {
				$('#bwd_' + action + '_article_' + results.data[i].id).html(BWD_ArticleHTML(results.data[i]));
			}
			convertUTC2Local();
		}
    })
    .catch(function(error) {
      console.log('An error occurred when invoking BWD.Articles.getById(). Error: ', error);
    });
	}
}	// function BWD_GetArticles

function BWD_GetJobs(ids,action,format) {
	format = format || 'long';
	if (ids.length) {
  BWD.Jobs.getById(ids)
    .then(function(results) {
      console.log('BWD.Jobs.getById() returned successfully. Results: ', results);
		if (results.data.length) {
			for (var i=0; i<results.data.length; i++) {
				$('#bwd_feed_wrapper').append('<div>' + results.data[i].id + '</div>');
			}
			for (var i=0; i<results.data.length; i++) {
				if (results.data[i].company && results.data[i].company.id.toString().length) {
					//console.log("adding " + results.data[i].company.id,results.data[i].company);
					bwdCo[results.data[i].company.id.toString()] = results.data[i].company;
				}
				$('#bwd_' + action + '_job_' + results.data[i].id).html(BWD_JobHTML(results.data[i],format));
			}
			convertUTC2Local();
			$('.bwd-pass').click(function(){BWD_JobPass(this);});
			//$('.bwd-checkvote').click(function(){BWD_CheckVote(this);});
			//$(".twist-job").click(function(event){ExpandJob(event.target);});
			//console.log("bwdCo: ", bwdCo);
		}
    })
    .catch(function(error) {
      console.log('An error occurred when invoking BWD.Jobs.getById(). Error: ', error);
    });
	}
}	// function BWD_GetJobs

function BWD_JobPass(o) {
	var $target = $(o).parents('div.bwd_result').first();
	var id = $target.attr('data-id');
	var data = {source: 'e2e'};
	$target.hide(400);
	BWD.Jobs.setPass(id,data)
		.then(function(results) {
			console.log('BWD.Jobs.setPass returned successfully: ',results);
		})
		.catch(function(){console.log('Error in BWD.Jobs.setPass(' + id + ',[data]): ',error)});
}	// function BWD_JobPass

function BWD_JobFavorite(o) {
	var $target = $(o).parents('div.bwd_result').first();
	var id = $target.attr('data-id');
	var data = {source: 'e2e'};
	BWD.Jobs.setFavorite(id,data)
		.then(function(results){
			console.log('BWD.Jobs.setFavorite returned successfully: ',results);
		})
		.catch(function(){console.log('Error in BWD.Jobs.setFavorite(' + id + ',[data]): ',error)});
}
function BWD_CheckVote(o) {
	var $target = $(o).parents('div.bwd_result').first();
	var id = $target.attr('data-id');
	BWD.Jobs.isPass(id)
		.then(function(results){
			console.log('BWD.Jobs.isPass(' + id + ') result: ',results);
		})
		.catch(function(){console.log('Error in BWD.Jobs.isPass(' + id + '): ',error)});
}

function BWD_JobHTML(job,format) {
	var html = [];
	var logo = "";
	html.push('<div class="bwd_result panel" data-id="' + job.id + '"><div class="panel-body">')
	if (format == 'long') {
		if (job.company) {
			if (job.company.logo && job.company.logo.length) {
				logo = '<img src="' + job.company.logo + '" class="bwd-img-logo clickable" onclick="BWD_GetCompany(\'' + job.company.id + '\',this,{x:window.pageXOffset,y:window.pageYOffset})" />';
			}
			html.push('<div><b><span class="clickable" onclick="BWD_GetCompany(\'' + job.company.id + '\',this,{x:window.pageXOffset,y:window.pageYOffset})">' + job.company.name + '</span></b>' + logo + '</div>');
		}
		var d = new Date(job.createdDate);
		html.push('<div style="clear:both;"><span class="datetime-utc2local">' + d.toUTCString() + '</span></div>')
	//  <img class="clickable twist-job" onclick="ExpandJob(this);" height="24" width="24" src="/theme/myimpact/images/icons/twisty/arrowdown.png" alt="show/hide links" />
		var title = job.title;
		if (job.jobLink && job.jobLink.length) {
			title = '<a href="' + job.jobLink +'" target="_blank">' + title + '</a>';
		}
		html.push('<div class="black-text large-text bwd-job-title"><b>' + title + '</b></div>');
		if (job.location) {
			html.push('<div class="large-text bwd-job-location">' + job.location.name + '</div>');
		}
		html.push('<div style="clear:both;"></div>');
		//html.push(BWD_CompanyHTML(job.company));
		if (job.company && job.company.headerImage && job.company.headerImage.length) {
			html.push('<div class="bwd-img-header-wrap"><img src="' + job.company.headerImage + '" class="bwd-img-header" /></div>');
		}
		/*
		if (job.company.slideshow.length) {
			html.push('company slide:<br /><img src="' + job.company.slideshow[0] + '" class="bwd-img-header" />');
		}
		*/
		if (job.headline && job.headline.length) {
			html.push('<div><h1>' + job.headline + '</h2></div>');
		}

		// pass/favorite 
		//html.push('<div class="row bucket-header bwd_passfail"><div class="bwd-pass pull-left clickable">Not Interested ("Pass")</div><div class="bwd-favorite pull-right clickable">I like this one ("Favorite")</div></div><div style="clear:both;"></div>');
		//<div class="bwd-checkvote clickable">Check vote</div>

		// detail box
		html.push('<div class="small bwd_description bwd_description_partial">');
		if (job.compensation && job.compensation.length) {
			html.push('<div><b>Compensation</b>: $' + Number(job.compensation).toLocaleString() + '</div>');
		}
		if (job.responsibilities && job.responsibilities.length) {
			if (Array.isArray(job.responsibilities)) {
				html.push('<div><b>Responsibilities</b>:<ul>');
				for (i=0; i<job.responsibilities.length; i++) {
					html.push('<li>' + job.responsibilities[i] + '</li>');
				}
				html.push('</ul></div>');
			} else {
				html.push('<div><b>Responsibilities</b>: ' + job.responsibilities.toString() + '</div>');
			}
		}
		if (job.onets) {
			html.push('<div><b>O*NET Occupational Information</b>:<ul><li>' + job.onets[0].onetCode + ' ' + job.onets[0].name + '</li>');
			if (job.onets[0].lead && job.onets[0].lead.length) {
				html.push('<li>' + job.onets[0].lead + '</li>');
			}
			html.push('</ul></div>');
		}
		if (job.description && job.description.length) {
			html.push('<div><b>Description</b>:</div><div style="padding-left:10px;">' + job.description + '</div>');
		}
		html.push('</div>');	// detail box
	}
	else if (format == 'ids') {
		html.push('<div>' + job.id + '</div>');
	}
	else {
		// format is "short"
		html.push('<div class="pull-left" style="border-bottom: 1px solid #999;">');
		html.push('<div>' + job.company.name + '</div>');
		html.push('<div>' + job.title + '</div>');
		html.push('</div>');

		html.push('<div class="pull-right" style="border-bottom: 1px solid #999;">');
		var d = new Date(Number(job.createdDate));
		html.push('<div>' + d.toUTCString() + '</div>');
		html.push('<div>' + job.location.name + '</div>');
		html.push('</div>');
		
		html.push('<div style="clear:both;"></div>');

		html.push('<div style="border-bottom: 1px solid #DDD;>' + job.headline + '</div>');

		if (job.responsibilities && job.responsibilities.length) {
			html.push('<div><b>Responsibilities</b>: ');
			if (Array.isArray(job.responsibilities)) {
				html.push('<ul>');
				for (i=0; i<job.responsibilities.length; i++) {
					html.push('<li>' + job.responsibilities[i] + '</li>');
				}
				html.push('</ul>');
			} else {
				html.push(job.responsibilities.toString());
			}
			html.push('</div>');
		}

		html.push('<div>' + job.description + '</div>');

	}

	html.push('</div></div>');

	return html.join('');

}	// function BWD_JobHTML

function ExpandJob(o) {
	$(o).parent('div').nextAll('div.bwd-job-expand').toggle();
	if ($(o).attr('src').match(/arrowdown.png/)) {
		$(o).attr('src',$(o).attr('src').replace(/arrowdown/,'arrowup'));
	}
	else {
		$(o).attr('src',$(o).attr('src').replace(/arrowup/,'arrowdown'));
	}
}

function BWD_CompanyHTML(co) {
	var html = [];
	html.push('<div class="large-text black-text">' + co.name + '</div>');

	return html.join('');

}	// function BWD_CompanyHTML

function BWD_ArticleHTML(art) {
	var html = [];
	var link = "";
	var linkclass = "";
	if (art.link && art.link.length) {
		linkclass = " clickable";
		link = ' onclick="window.open(\'' + art.link + '\')"';
	}
	html.push('<div class="panel"><div class="panel-body' + linkclass + '"' + link + '>')
	html.push('<div><b>' + art.company.name + '</b></div>');
	html.push('<div class="black-text large-text bwd-job-title">' + art.title + '</div><div class="large-text bwd-job-location">Article</div><div style="clear:both;"></div>');
	
	if (art.company.headerImage && art.company.headerImage.length) {
		html.push('<div class="bwd-img-header-wrap"><img src="' + art.company.headerImage + '" class="bwd-img-header" /></div>');
	}
	html.push('<div class="small bwd_description">' + art.summary + '</div>');
	html.push('</div></div>');

	return html.join('');

}	// function BWD_ArticleHTML

function BWD_GetCompany(id,src,scrollMem) {
	var co = bwdCo[id.toString()];

	if (co.glassdoor && co.glassdoor.hasOwnProperty('company')) {

		BWD_DisplayCompany(co,src,scrollMem);

	} else {

		var params = {companyId: id};

		BWD.Glassdoor.getCompanyInfo(params)
			.then(function(results) {
				//console.log('Glassdoor: ', results);
				if (results.data && results.data.length) {
					co.glassdoor = results.data[0];
				} else {
					co.glassdoor = {};
				}
				BWD_DisplayCompany(co,src,scrollMem);
			})
			.catch(function(error) {
				console.log('An error occurred when invoking BWD.Glassdoor.getCompanyInfo({companyId:' + id + '}). Error:', error);
			});
	}

} // function BWD_GetCompany

function BWD_DisplayCompany(co,src,scrollMem) {
	var $src_section = $(src).parents('.bwd_wrapper');
	var $src_entry = $(src).parents('.bwd_entry').first();
	var $wrap = $('#bwd_company_wrapper');
	var html = [];
	var logo = "";
	var links = [];
	var i;

	console.log("showing company: ",co);
	if (co.logo && co.logo.length) {
		logo = '<img src="' + co.logo + '" class="bwd-img-logo-codetail pull-right" />';
	}

	html.push(logo + '<div><h1>' + co.name + '</h1></div>');
	if (co.lead && co.lead.length) {
		html.push('<div class="large-text">' + co.lead + '</div>');
	}

	html.push('<div class="bwd-co-social">');
	var u = co.url;
	if (u.slice(0,3) != 'http') {
		u = 'http://' + u;
	}
	if (co.url && co.url.length) {
		links.push('<a href="' + u + '">Website</a>');
	}
	var soc = ['facebook','linkedin','twitter','youtube'];
	for (i=0; i<soc.length; i++) {
		if (co[soc[i]] && co[soc[i]].length) {
			links.push('<a href="' + co[soc[i]] + '"><img src="theme/myimpact/images/icons/'+ soc[i] + '.png" /></a>');
		}
	}
	
	if (links.length) {
		html.push(links.join(' '));
	}
	html.push('</div>');

	if (co.headerImage && co.headerImage.length) {
		html.push('<img src="' + co.headerImage + '" class="bwd-img-header" />')
	}
	if (co.sublead && co.sublead.length) {
		html.push('<div class="text-center"><h4>' + co.sublead + '</h4></div>')
	}
	/*
	if (co.description && co.description.length) {
		html.push('<div class="text-center">' + co.description + '</div>');
	}
*/
	if ((co.foundingDate && Number(co.foundingDate) > 0) || (co.employees && co.employees.length)) {
		html.push('<div class="bwd_co_section_head"><div><b>Company</b></div></div>');
		if (co.foundingDate && Number(co.foundingDate) > 0) {
			html.push('<div class="col-sm-30 col-md-15"><b>Founded:</b> ' + co.foundingDate + '</div>');
		}
		if (co.employees && co.employees.length) {
			html.push('<div class="col-sm-30 col-md-15"><b>Employees:</b> ' + Number(co.employees).toLocaleString() + '</div>');
		}
		html.push('<div style="clear:both;margin-bottom:10px;"></div>');
		html.push('<div class="text-center">' + co.description + '</div>');
	}

	function GDRating(o) {
		var str = o.title + '<br />';
		for (var i=1; i<=5; i++) {
			str = (i > Number(o.value)) ? str + 'o ' : str + '* ';
		}
		return str;
	}
	if (co.glassdoor) {
		var glass_attrib = '<div class="pull-right">Powered by <img src="/theme/myimpact/images/icons/glassdoor.png" class="bwd_glassdoor" /></div>'
		
		if (co.glassdoor.reputation) {
			html.push('<div class="bwd_co_section_head">');
			html.push(glass_attrib + '<div><b>Reputation</b></div><div style="clear:both;"></div>')
			html.push('</div>');
			gdratings = ['culture','leadership','opportunity','worklife'];
			for (i=0; i<gdratings.length; i++) {
				if (co.glassdoor.reputation[gdratings[i]]) {
					html.push('<div class="col-sm-30 col-md-15 text-center">' + GDRating(co.glassdoor.reputation[gdratings[i]]) + '</div>');
				} else {
					console.log('not found: co.glassdoor.reputation["' + gdratings[i] + '"]');
				}
			}
			html.push('<div style="clear:both;"></div>');
			//html.push('</div>');
		}
		if (co.glassdoor.companyReviews && co.glassdoor.companyReviews.length) {
			html.push('<div class="bwd_co_section_head">');
			html.push(glass_attrib + '<div><b>Reviews</b></div><div style="clear:both;"></div>');
			html.push('</div>');
			for (i=0; i<co.glassdoor.companyReviews.length; i++) {
				html.push('<div class="text-center" style="padding:10px 0px 10px 0px;">' + co.glassdoor.companyReviews[i] + '</div>');
			}
			//html.push('</div></div></div>');
		}
		
	}
	$wrap.html(html.join(''));

	//var $back = $('<span class="clickable large-text">Back</span>');
	var but_tit = 'Back To Search Results';
	if ($src_section.attr('id') == 'bwd_feed_wrapper') {
		but_tit = 'Back To Feed';
	}
	var $back = $('<button class="btn btn-primary text-uppercase" role="button" value="Back">' + but_tit + '</button>');
	$back.click(function(){
		$wrap.hide();
		$src_section.show();
		window.scrollTo(scrollMem.x,scrollMem.y);
	});
	var $backDiv = $('<div></div>');
	$backDiv.append($back);
	$wrap.prepend($backDiv.clone(true));
	$wrap.append($backDiv.clone(true));
	$wrap.show();
	$src_section.hide();
	window.scrollTo(0,0);
}	// function BWD_GetCompany

// Shared helpers

function htmlLineBreak(str) {
	return str.replace(/(?:\r\n|\r|\n)/g, '<br />');
}

function isAuthenticated() {
  var token = BWD.Config.get('AccessToken');
  return token && (token.access_token || token.id_token);
};

function PopUpTest() {
/*
FIREFOX: hamburger, options, Content, Pop-ups-Exceptions
CHROME: hamberger, settings, advanced, Privacy and Security - Content settings, Popups, Allow-Add
IE: Gear or Tools, Internet Options, Privacy, Pop-Up Blocker - Settings, Add
EDGE: Can only turn on or off completely.  Just don't provide instructions for now and users will need to switch to one of the others.
SAFARI:
*/
	/*
		Note:  using a local file ("empty.html") as the url for the test window is important.
			On IE, the pop-up window may open even with pop-up blocking enabled but if the URL
			specified for the pop-up is blank or on an external domain, then the window object
			returned by the open() function is null and cannot be closed.  Other browsers seem
			to work as expected in that either the pop-up window opens and a window object is returned
			that can be immediately closed, or it is blocked and no window opens and null is returned.
	*/
	var success = false;
	var w1 = window.open("\empty.html","banana","width=1,height=1");
	if (w1) {
		w1.blur();
		success = true;
	}

	setTimeout(function(){
		if (w1) {
			w1.close();
		}
		else {
			console.log("false: ",w1);
			$("#popup_warning").show();
		}
	},100);
	return success;
}

// On page load
jQuery(function(){

	bwdval.APIEnv = "prod";
	bwdval.BackendEnv = "stage";
	bwdval.key = "1uSAZjUNmJex73UaizVAYvxWwG8Kt1Yb";
	bwdval.secret = "k9haLky2ujlWXSUU";
	//bwdval.Auth0ID = "UcSAGvH594YF6OOkx0zejptmHCeDUdt3";
	bwdval.Auth0ID = "0Yz7N29uhI2d060otOG0iRStULwP8zdM";
	bwdval.fullname = $('#bwd_user_full_name').val();
	bwdval.login = $('#bwd_user_login_raw').val();
	bwdval.password = $('#bwd_user_password_raw').val();

	window.BWD.Config.set ({
		APIEnv: bwdval.APIEnv,
		APIKey: bwdval.key,
		APISecret: bwdval.secret,
		BackendEnv: bwdval.BackendEnv
	});

	BWD_GetApigeeAccessToken();
	if (Number($('#bwd_new_user').val())) {
		console.log('new bwd user');
		//BWD_RegisterUser();
	} else {
		console.log('existing bwd user');
		BWD_getAuth0Token('access')
	}
	//$('#jobAreaId').keyup(function(event) {window.getAutocompletionsForJobAreas(event.target);})
	//$( "#jobAreaId" ).autocomplete({source:''});


	// Set up the job area field autocomplete to specific values to pulled from BWD
	/*
	$( "#jobAreaLabel" ).autocomplete({
		source: function(request,response){
			BWD.JobAreas.autocomplete(request.term)
				.then(function(results) {
					if (results.data.length) {
						for (var i = 0; i < results.data.length; i++) {
							results.data[i].value = results.data[i].id;
						}
					}
					response(results.data);
				})
				.catch(function(error) {console.log("Error retrieving job areas (autocomplete)",error);})
		},
		select: function(event,ui) {
			$('#jobAreaLabel').val(ui.item.label);
			$('#jobAreaId').val(ui.item.value);
			return false;
		},
		focus: function(event,ui) {
			return false;
		}
		//minLength: 2		// does not seem to be needed due to low # of job areas available.  BWD says job areas parameter for searches is deprecated.
	});
	*/
});



/*
window.getAutocompletionsForJobAreas = function(target) {
  if(window.event) {window.event.preventDefault();}

  if (!isAuthenticated()) {
    $('#bwdJobAreasStatus')
      //.attr('class', 'alert')
      //.addClass('alert-danger')
      .text('You must get an API token before you can use this method.');
    return;
  }

  var jobAreaTitle = $(target).val();

  $('#bwdJobAreasTableBody').html('');
  $('#bwdJobAreasStatus')
    //.attr('class', 'alert')
    //.addClass('alert-warning')
    .text('Loading...');

  var query = {
    title: jobAreaTitle
  };

  BWD.JobAreas.autocomplete(jobAreaTitle)
    .then(function(results) {
      console.log('BWD.JobAreas.autocomplete() returned successfully. Results: ', results);
      var tableHtml;
		var jobAreas = [];
		if (results.data.length) {
			for (var i = 0; i < results.data.length; i++) {
				tableHtml += objToTableRow(results.data[i], ['id', 'label']);
				jobAreas.push({label:results.data[i].label, value:results.data[i].id});
			}
			
		$('#bwdJobAreasStatus')
			//.attr('class', 'alert')
			//.addClass('alert-success')
			.html('Successfully received job areas.') //<br/><br/>This request can be performed with curl using the following options:<pre>' + window.mockCurl('autocomplete/jobarea', query, 'GET') + '</pre>');
		} else {
			$('#bwdJobAreasStatus')
				//.attr('class', 'alert')
				//.addClass('alert-warning')
				.text('No job areas found with given title.');
		}
		
		$('#bwdJobAreasTableBody').html(tableHtml);
	})
	.catch(function(error) {
		console.log('An error occurred when invoking BWD.JobAreas.autocomplete(). Error: ', error);
		$('#bwdJobAreasTableBody').html('');
		$('#bwdJobAreasStatus')
			//.attr('class', 'alert')
			//.addClass('alert-danger')
			.text('An error occurred when getting job areas: ' + error.message);
	});
};
*/


function BWD_GetApigeeAccessToken() {
	if (window.event) {window.event.preventDefault();}

	//$('#bwdAccessTokenStatus').attr('class', 'alert').addClass('alert-warning').text('Loading...');

	BWD.Client.getAccessToken()
	.then(function(results) {
		//console.log('BWD.Client.getAccessToken() returned successfully. Results:', results);
		bwdval.access_token = '';
		if (results.hasOwnProperty('access_token') && results.hasOwnProperty('status') && results.status === 'approved') {
			bwdval.access_token = results.access_token;
			//BWD_RegisterUser();
			
			$('#locationId').empty();
			BWD.Locations.get({fields:'id,name'})
				.then(function(results) {
					if (results.data.length) {
						var selectData = BWD_StateSort(results.data);
						for (var i = 0; i < selectData.length; i++) {
							$('#bwd_location_id').append('<option value=' + selectData[i].val + '>' + selectData[i].opt + '</option>');
						}
					}
				})
				.catch(function(error) {console.log('An error occurred when invoking BWD.Locations.get(). Error: ', error);});

		} else {
			console.log('Received response, but did not receive a valid access token.', results);
		}
	})
	.catch(function(error) {
		console.log('An error occurred when invoking BWD.Client.getAccessToken(). Error:', error);
	});

	BWD.Config.set({
		AccessToken: {
			access_token: bwdval.access_token
		}
	})
};

