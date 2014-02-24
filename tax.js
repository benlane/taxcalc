var config = {

	'limits' : {
		'upper' : 100000,
		'pensioner' : 26100
	},

	'allowance' : {
		'under-65' : 9440,
		'65-74' : 10500,
		'75+' : 10660,
		'blind' : 2160
	},
	'bands' : [
		{
			'lower' : 0,
			'upper' : 32010,
			'percent' : 20
		},
		{
			'lower' : 32010,
			'upper' : 150000,
			'percent' : 40
		},
		{
			'lower' : 150000,
			'upper' : '',
			'percent' : 45
		}
	],
	'nicBands' : [
			{
				'lower' : 7748,
				'upper' : 41444,
				'percent' : 12
			},
			{
				'lower' : 41444,
				'upper' : '',
				'percent' : 2
			}
	],
	'studentLoan' : {
		'lower' : 16365,
		'percent' : 9
	},
	'taxcodeAddition': '9'
}

var taxCalc = {}

taxCalc.getTaxable = function(salary, age, blind, childcare, pension){

	//todo workout starting allowance first then workout actuall allowance then taxable = salary - allowance;

	var taxable,
	allowance = 0;

	if(blind){
		allowance += config.allowance.blind;
	}

	if(childcare>0){
		allowance += childcare;
	}

	if(pension>0){
		allowance += pension;
	}

	if(age !== 'under-65'){

		if(salary <= config.limits.pensioner){
			allowance+= config.allowance[age];
		}else{
			var over = salary - config.limits.pensioner;
			var newAllowance = config.allowance[age]-(over/2);

			if(newAllowance<config.allowance['under-65']){
				newAllowance = config.allowance['under-65'];
			}

			allowance += newAllowance;

		}

	}else{

		allowance+= config.allowance[age];
	}

	if(salary>config.limits.upper){

		var over = salary - config.limits.upper;

		var newAllowance = (config.allowance[age] + allowance) -(over/2);

		if(newAllowance<0){
			newAllowance = 0;
		}

		allowance = newAllowance;

	}

	taxable = salary - allowance;

	taxable = (taxable<0) ? 0 : taxable;

	return taxable;
}

taxCalc.percentAsDecimal = function(percent){
	return percent/100;
}

taxCalc.getTax = function(taxable){

	var tax = {
		'bands' : [],
		'total' : 0
	};
	var  runningTotal = taxable;

	var bands = config.bands.slice(0);

	bands.reverse();

	//console.log(bands);

	$.each(bands, function(index, val){

		var amt = 0;

		if(runningTotal>=val.lower){
			amt = (runningTotal - val.lower) * taxCalc.percentAsDecimal(val.percent);
			runningTotal = val.lower
		}

		tax.bands[index] = {
			'percent' : val.percent,
			'ammount' : amt
		}

		tax.total += amt;

	});

	return tax;
}

taxCalc.getTaxAtRate = function(amt, rate){
	return amt * taxCalc.percentAsDecimal(rate);
}

taxCalc.getNIC = function(salary){

	var nic = {
		'bands' : [],
		'total' : 0
	};
	var  runningTotal = salary;

	var bands = config.nicBands.slice(0);

	bands.reverse();

	$.each(bands, function(index, val){

		var amt = 0;

		if(runningTotal>=val.lower){
			amt = (runningTotal - val.lower) * taxCalc.percentAsDecimal(val.percent);
			runningTotal = val.lower
		}

		nic.bands[index] = {
			'percent' : val.percent,
			'ammount' : amt
		}

		nic.total += amt;

	});

	return nic;
}


taxCalc.getStudentLoan = function(salary){

	var studentLoan = 0;

	if(salary>config.studentLoan.lower){
		studentLoan = (salary-config.studentLoan.lower) * taxCalc.percentAsDecimal(config.studentLoan.percent);
	}

	return Math.floor(studentLoan);
}

taxCalc.getTaxFromTaxcode = function(salary, code){

	//This function makes an attempt to interpret the tax code and then provide a calculation based on it.

	var emergancy = false;

	code = code.toUpperCase();

	if(code.indexOf('M1')>=0 || code.indexOf('W1')){
		code = code.replace(/(W|M)1/g, '');
		emergancy = true;
		console.log(code);
	}

	var letters = code.replace(/[0-9]/g, '');
	var numbers = code.replace(/[^0-9]/g,'');

	var tax;

	switch (code) {
		case 'BR':
		tax = taxCalc.getTaxAtRate(salary, config.bands[0].percent);
		break;

		case 'D0':
		tax = taxCalc.getTaxAtRate(salary, config.bands[1].percent);
		break;

		case 'D1':
		tax = taxCalc.getTaxAtRate(salary, config.bands[2].percent);
		break;

		case 'NT':
		tax = 0;

		break

		case '0T':
		tax = taxCalc.getTax(salary);

		break;
	}

	// K tax codes are special, the numbers indicate an ammount to add to the salary to tax. It can't tak emore than 50% though.

	if(code.indexOf('K')>=0){
		tax = taxCalc.getTax(salary+(numbers*10));

		tax.total = (tax.total>salary/2) ? salary/2 : tax.total;
	}

	var otherLetters = ['L', 'P', 'Y', 'T'];

	for (var i = 0; i < otherLetters.length; i++) {

		if(code.indexOf(otherLetters[i])>=0){

			//add a 9 to the end to get your personal allowance, because HMRC are crazy like that.

			var allowance = numbers.toString() + config.taxcodeAddition;
			allowance = parseFloat(allowance, 10);

			tax = taxCalc.getTax(salary-allowance);
		}
	};

	return tax;

}

$(document).ready(function(){

	$('#submit').on('click', function(){
		
		//get all the values of inputs
		var salary = $('#salary').val();
		var age = $('#age').val();
		var blind = $('#blind').is(':checked');
		var childcare = $('#childcare').val();
		var childcareFreq = $('#childcareFreq').val();
		var pension = $('#pension').val();
		var pensionType = $('#pensionType').val();

		//workout childcare TODO there is somethign about pre certain date for higher earners
		if(childcare != '' && parseFloat(childcare)>0){
			
			if(childcareFreq == 'weekly'){
				childcare = parseFloat(childcare) * 52;
			}else if(childcareFreq == 'monthly'){
				childcare = parseFloat(childcare) * 12;
			}

		}else{
			childcare = 0;
		}

		//workout pension contributions TODO: there is an upper limit to pension contributions 50,000?
		if(pension != '' && parseFloat(pension)>0){

			if(pensionType == 'amount'){
				pension = parseFloat(pension);
			}else if(pensionType == 'percentage'){
				pension = parseFloat(salary) * taxCalc.percentAsDecimal(pension);
			}

		}else{
			pension = 0;
		}

		//TODO : something to do with married couples allowance over 65s?

		//get the taxable amount
		var taxable = taxCalc.getTaxable(salary, age, blind, childcare, pension);

		//get the tax on the taxable amount
		var taxed = taxCalc.getTax(taxable);

		//get the National Insurance Contribution  TODO: over certain age no NIC is due.
		var nic = taxCalc.getNIC(salary);

		//get student load inf applicable
		var studentLoan = ($('#studentLoan').is(':checked')) ? taxCalc.getStudentLoan(salary) : 0;

		//get total deductions
		var deductions = taxed.total + nic.total + studentLoan + pension;

		//display taxable amount
		$('#taxable').text(taxable);

		//display the tax at certain bands
		var html ='';
		$.each(taxed.bands, function(index, val){
			html += '<h3>'+val.percent+'% Band</h3> <p>&pound;'+val.ammount+'</p>'
		});

		html += '<h3>Total</h3> <p><strong>&pound;'+taxed.total+'</strong></p>'

		//display calculations
		$('#taxed').html(html);
		$('#nic').html(nic.total);
		$('#studentLoanRepayment').html(studentLoan);
		$('#deductions').html(deductions);


		$('#total').html((salary - deductions).toFixed(2));

	});

});