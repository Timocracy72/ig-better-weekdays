<cfquery name="qryPerson_bwd" datasource="#request.app.data_source#">
	SELECT *	FROM person_bwd WHERE person_id = #request.user.person_id#
</cfquery>
<cfif qryPerson_bwd.RecordCount GT 0>
	<cfset bwd_login = qryPerson_bwd.login_name>
	<cfset bwd_password = qryPerson_bwd.login_password>
	<cfset bwd_new_user = 0>
<cfelse>
	<cfset bwd_login = request.user.email>
	<cfset bwd_password = request.udf.CreateBWDPassword()>
	<cfset bwd_new_user = 1>
</cfif>
<cfset bwd_login_encryp = request.udf.IGEncrypt(bwd_login)>
<cfset bwd_password_encryp = request.udf.IGEncrypt(bwd_password)>
<cfif Len(Trim(request.user.spouse_name)) EQ 0>
	<cfset bwd_user_name = request.user.employee_name>
<cfelse>
	<cfset bwd_user_name = request.user.spouse_name>
</cfif>
<cfoutput><input type="hidden" name="js_prevent_logging" id="js_prevent_logging" value="#IIF(StructKeyExists(session,'impersonator'),DE('1'),DE('0'))#" /></cfoutput>
<cfinclude template="#request.app.path_udf#standard.cfm">
<!---<script type="text/javascript" src="/theme/myimpact/js/job-search-results.js?v=2"></script>--->

<cfset jsform = SESSION["jsform#URL.key#"]>

<style type="text/css">
/*
	#bwd_feed_wrapper .panel-body div {
		margin-top: 10px;
		margin-bottom: 10px;
	}
	#bwd_feed_wrapper .panel-body div:first-child {
		margin-top: 0px;
		margin-bottom: 0px;
	}
*/
	.bwd-img-logo {
		max-width: 100px;
		max-height: 100px;
		float: right;
		margin-top: -15px;
		margin-right: -15px;
		border:1px solid #EEE;
		border-width: 0px 0px 1px 1px;
	}
	.bwd-img-logo-codetail {
		max-width: 200px;
		max-height: 150px;
		border:1px solid #EEE;
		margin-left: 15px;
	}
	.bwd-img-header-wrap {
		margin-left: -15px;
		margin-right: -15px;
	}
	.bwd-img-header {
		width: 100%;
		/*margin-bottom: 10px;*/
		/*max-height: 300px;*/
	}

	.bwd-job-title {
		float: left;
		width: 50%;
	}

	.bwd-job-location {
		float: right;
		width: 50%;
		text-align: right;
	}
	.bwd_passfail {
		padding: 10px;
	}
	.bwd_description {
		border-top: 1px solid silver;
		padding-top: 10px;
		overflow: auto;
	}
	.bwd_description_partial {
		max-height: 300px;
	}
	.clickable {
		cursor:pointer;
	}
	.bwd-separated {
		padding-top: 10px;
		padding-bottom: 10px;
		border-bottom: 1px solid #DDD;
	}
	.bwd-co-name {
		font-size: 3rem;
		font-weight: bold;
	}
	.bwd-co-social {
		padding: 10px 0px 10px 0px;
		clear:both;
	}
	.bwd-co-social img {
		padding-left: 10px;
	}
	.bwd_glassdoor {
		max-height: 25px;
	}
	.bwd_co_section_head {
		border-width: 1px 0px 1px 0px;
		border-color: #DDD;
		border-style: solid;
		margin: 10px 0px 10px 0px;
	}
</style>

<cfoutput>
<input id="isDelivery" type="hidden" value="#IIF(Val(request.user.delivery_id_outplacement) + Val(request.user.delivery_id_relo) + Val(request.user.delivery_id_talent) GT 0, DE('1'), DE('0'))#">
<input id="bwd_person_id" type="hidden" value="#request.udf.IGEncrypt(request.user.person_id)#" />
<input id="bwd_user_login_raw" type="hidden" value="#bwd_login#" /><input id="bwd_user_login" type="hidden" value="#bwd_login_encryp#" />
<input id="bwd_user_password_raw" type="hidden" value="#bwd_password#" /><input id="bwd_user_password" type="hidden" value="#bwd_password_encryp#" />
<input id="bwd_new_user" type="hidden" value="#bwd_new_user#" />
<input id="bwd_results_page" type="hidden" value="1" />
<input id="bwd_results_range" type="hidden" value="10" />
<input id="bwd_cur_results_range" type="hidden" value="" />
</cfoutput>

<div id="popup_warning" style="display:none;">
	Please turn off your pop-up blocker or add "www.myimpactportal.com" to the list of allowed sites.
</div>

<!---<button onclick="BWD_getAuth0Token('access');" value="Log In">Log In</button>--->
<!---<button onclick="BWD_GetMe();" value="Get Me">Get Me</button>--->
<div><button onclick="BWD_GetFeed()" value="Get Feed">Get Feed</button></div>
<!---
<div class="ui-widget">
  <label for="jobAreaLabel">Job Area: </label>
  <input id="jobAreaLabel" type="text" />
  <input id="jobAreaId" type="hidden" />
</div>
--->
<div>
	<label for="bwd_location_id">Location: </label>
	<select id="bwd_location_id" type="text"></select>
	<input id="bwd_cur_location_id" type="hidden" type="text" value="" />
</div>

<div>
	<label for="bwd_keyword_title">Title: </label>
	<input type="text" id="bwd_keyword_title" />
	<input id="bwd_cur_keyword_title" type="hidden" type="text" value="" />
</div>
<!---
<cfif bwd_new_user EQ 0>
	<div><button onclick="BWD_RegisterUser();" value="Register">Register</button></div>
</cfif>
--->
<div><button onclick="BWD_SearchJobs($('#bwd_results_page').val(),0,'long');" value="Search">Search Jobs (long format)</button></div>
<div><button onclick="BWD_SearchJobs($('#bwd_results_page').val(),0,'short');" value="Search">Search Jobs (short format)</button></div>

<div id="bwd_feed_wrapper" class="bwd_wrapper" style="margin-left:10%;margin-right:10%"></div>
<div id="bwd_search_wrapper" class="bwd_wrapper" style="margin-left:10%;margin-right:10%"></div>
<div id="bwd_company_wrapper" class="bwd_wrapper"></div>

<cfif NOT StructKeyExists(session,"impersonator")>
	<!---<script type="text/javascript" src="/theme/myimpact/js/bwd-sdk.min.js"></script>--->
	<script type="text/javascript" src="/theme/myimpact/js/bwd-sdk.js"></script>
	<script type="text/javascript" src="/theme/myimpact/js/job-search-results-bwd.js?v=1.12"></script>
</cfif>