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
	}
}

// config = {
// 	'allowance' : 8105,
// 	'bands' : [
// 		{
// 			'lower' : 0,
// 			'upper' : 34370,
// 			'percent' : 20
// 		},
// 		{
// 			'lower' : 34370,
// 			'upper' : 150000,
// 			'percent' : 40
// 		},
// 		{
// 			'lower' : 150000,
// 			'upper' : '',
// 			'percent' : 50
// 		}
// 	]
// }

var taxCalc = {}

taxCalc.getTaxable = function(salary, age, blind){

	//todo workout starting allowance first then workout actuall allowance then taxable = salary - allowance;

	var taxable,
	allowance = 0;

	if(blind){
		allowance += config.allowance.blind;
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

			//taxable = salary - (newAllowance + allowance) ;

			allowance += newAllowance;

		}

	}else{
		//taxable = salary - (config.allowance[age] + allowance);

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

		//console.log('running total', runningTotal);

		tax.total += amt;

	});

	return tax;
}

taxCalc.getNIC = function(salary){

	var nic = {
		'bands' : [],
		'total' : 0
	};
	var  runningTotal = salary;

	var bands = config.nicBands.slice(0);

	bands.reverse();

	//console.log(bands);

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

		//console.log('running total', runningTotal);

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

$(document).ready(function(){

	$('#submit').on('click', function(){
		
		var salary = $('#salary').val();
		var age = $('#age').val();
		var blind = $('#blind').is(':checked');

		$('#taxable').text(taxCalc.getTaxable(salary, age, blind));

		//console.log('blind', blind);

		var taxable = taxCalc.getTaxable(salary, age, blind);

		var taxed = taxCalc.getTax(taxable);

		var nic = taxCalc.getNIC(salary);

		var studentLoan = ($('#studentLoan').is(':checked')) ? taxCalc.getStudentLoan(salary) : 0;

		var deductions = taxed.total + nic.total + studentLoan;

		//console.log('taxed', taxed)

		var html ='';
		$.each(taxed.bands, function(index, val){
			html += '<h3>'+val.percent+'% Band</h3> <p>&pound;'+val.ammount+'</p>'
		})

		html += '<h3>Total</h3> <p><strong>&pound;'+taxed.total+'</strong></p>'

		$('#taxed').html(html);
		$('#nic').html(nic.total);
		$('#studentLoanRepayment').html(studentLoan);
		$('#deductions').html(deductions);


		$('#total').html((salary - deductions).toFixed(2));

	});

});