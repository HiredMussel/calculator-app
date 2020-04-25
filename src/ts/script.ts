/**
 * Interface for the feeData object which is used by Handlebars when determining
 * what to display.
 */
interface feeData {
    adminFeePounds: string,
    adminFeePennies: string,
    monthlyRepaymentPounds: string,
    monthlyRepaymentPennies: string,
    finalMonthPaymentPounds: string,
    finalMonthPaymentPennies: string,
    totalCostPounds: string,
    totalCostPennies: string,
    timeToRepay: string
}

/**
 * Interface for the errorFields object which is used to determine which elements
 * on the page will be used to display errors relating to the amount to borrow,
 * the estimated salary and the monthly payment percentage respectively
 */
interface errorFields {
    borrowValidationFail: Element,
    salaryValidationFail: Element,
    repayValidationFail: Element
}

/** 
 * Function to display an error in the HTML
 * 
 * @param {Element} errorElement the element in which the error message will be displayed
 * @param {string} errorMsg the error message to display
 */
function displayError(errorElement: Element, errorMsg: string) : void {
    errorElement.textContent = errorMsg;
    errorElement.classList.remove('d-none');
}

/**
 * Function to run validation on the contents of a given element
 * 
 * @param {boolean} condition the condition that the contents of the element should match
 * @param {string} errorMsg (optional) error message to display if validation fails
 * @param {Element} errorElement (optional) the element in which an error message should
 *                               be displayed
 */
function runValidation(condition: boolean, errorMsg?: string, errorElement?: Element) {
    try {
        if (condition) {
            if (errorElement) {
                errorElement.classList.add('d-none');
            }
            return true;
        } else {
            throw('Validation Failed');
        }
    } catch {
        if (errorElement) displayError(errorElement, errorMsg);
        return false;
    }
}

/**
 * Checks whether the contents of an element are a number between minValue and maxValue
 * 
 * @param {Element} amountField the field whose contents are to be checked
 * @param {number} minValue (optional) the minimum value that the field should contain
 *                          If undefined, set to minimum possible value JS can handle
 * @param {number} maxValue (optional) the maximum value that the field should contain
 *                          If undefined, set to maximum possible value JS can handle
 * 
 */
function amountCondition(amountField: HTMLFormElement, minValue?: number, maxValue?: number) : boolean {
    const amountToMeasure: number = parseInt(amountField.value);
    minValue = (minValue === undefined) ? -Infinity : minValue;
    maxValue = (maxValue === undefined) ? Infinity : maxValue;

    return (amountToMeasure >= minValue && amountToMeasure <= maxValue) ? true: false;
}

/**
 * Function to truncate a number to its last n digits, e.g. to display
 * a number of pennies as exactly two digits
 * 
 * @param {number} input the number to be truncated to its last n digits
 * @param {number} length the number of digits to return
 * 
 * @return {string} input truncated to its last length digits, padded with 0
 */
function rightTruncate(input: number, length: number): string {
    let stringToPad = input.toString();
    for (let i: number = 0; i < length; i++) {
        stringToPad = '0' + stringToPad;
    }
    return stringToPad.slice(-length);
}

/**
 * Function to run when button is pressed. Validates the contents of all relevant fields and then
 * displays the correct message to the output if all validation is passed.
 * 
 * @param {HTMLFormElement} borrowField the element containing the amount of money to be borrowed
 * @param {HTMLFormElement} salaryField the element containing the estimated monthly salary
 * @param {HTMLFormElement} repayPercField the element containing the percentage of salary to repay per month
 * @param {errorFields} errFields object containing the elements in which errors relating to each of the
 *                                input fields will be displayed
 */
function calculate(borrowField: HTMLFormElement, salaryField: HTMLFormElement, repayPercField: HTMLFormElement, errFields?: errorFields) : feeData {

    // Check that all validation is passed
    if (runValidation(amountCondition(borrowField, 0, 9000), 'Amount to borrow must be a number between 0 and 9000', errFields.borrowValidationFail)
    &&  runValidation(amountCondition(salaryField, 0), 'Expected monthly salary must be at least 0', errFields.salaryValidationFail)
    &&  runValidation(amountCondition(repayPercField, 10, 100), 'Amount to repay must be between 10% and 100%', errFields.repayValidationFail))
    {
        // parse contents of form fields as numbers
        const amountToBorrow: number = 100*parseFloat(borrowField.value);
        const expectedSalary: number = 100*parseFloat(salaryField.value);
        const monthlyPercRepay: number = parseFloat(repayPercField.value) / 100;

        // charge administrative fee and adjust total cost depending on amount borrowed
        const adminFee: number = Math.ceil(0.05*amountToBorrow);
        const totalCost: number = 800000 + ((amountToBorrow > 640000) ? 50000 : 0) + ((amountToBorrow > 720000) ? 50000 : 0);
        
        // work out the variables which will later be displayed in the div
        const monthlyAmountRepaid: number = Math.ceil(monthlyPercRepay*expectedSalary);
        const repayInLastMonth: number = totalCost % monthlyAmountRepaid;
        const timeToRepay: number = 1+Math.ceil((totalCost-repayInLastMonth)/monthlyAmountRepaid);
        
        // split the amounts to repay into pounds and pennies
        const adminFeePennies = adminFee % 100;
        const adminFeePounds = (adminFee - adminFeePennies)/100;

        const monthlyRepaymentPennies = monthlyAmountRepaid % 100;
        const monthlyRepaymentPounds = (monthlyAmountRepaid - monthlyRepaymentPennies)/100;

        const finalMonthPaymentPennies = repayInLastMonth % 100;
        const finalMonthPaymentPounds = (repayInLastMonth - finalMonthPaymentPennies) / 100;

        const totalCostPennies = totalCost % 100;
        const totalCostPounds = (totalCost - totalCostPennies) / 100;

        // return an object implementing the interface feeData, which is used by Handlebars when
        // outputting
        return {
            adminFeePounds: adminFeePounds.toString(),

            adminFeePennies: rightTruncate(adminFeePennies, 2),

            monthlyRepaymentPounds: monthlyRepaymentPounds.toString(),

            monthlyRepaymentPennies: rightTruncate(monthlyRepaymentPennies, 2),

            finalMonthPaymentPounds: finalMonthPaymentPounds.toString(),

            finalMonthPaymentPennies: rightTruncate(finalMonthPaymentPennies, 2),

            totalCostPounds: totalCostPounds.toString(),
            
            totalCostPennies: rightTruncate(totalCostPennies, 2),

            timeToRepay: timeToRepay.toString()
        }
    }
}

/**
 * Function to send the result of the calculation to handlebars
 * 
 * @param {Element} outputTo the element on the frontend to which the output will be written
 * @param {feeData} feeData an object containing information required by the handlebars template
 * 
 */
function outputLoanCalculations(outputTo: Element, feeData: feeData) : void {
    fetch('templates/output.hbs').then((response) => {
        return response.text()
    }).then((response) => {
        const template = Handlebars.compile(response);

        const html: string = template(feeData);

        outputTo.innerHTML = html;
    });
}

/**
 * Function to add event listeners to the "Calculate" button. Is invoked immediately
 */
(function main(): void {

    const calcButton: Element = document.querySelector('#calcLoan');

    calcButton.addEventListener('click', (e) => {

        e.preventDefault();
        
        const outputTo: Element = document.querySelector('#outputDiv');
        const borrowField: HTMLFormElement = document.querySelector('#amountToBorrow');
        const salaryField: HTMLFormElement = document.querySelector('#estimatedSalary');
        const percRepayField: HTMLFormElement = document.querySelector('#percToRepay');
        const errorFields: errorFields = {
            borrowValidationFail: document.querySelector('.borrowValidationFail'),
            salaryValidationFail: document.querySelector('.salaryValidationFail'),
            repayValidationFail: document.querySelector('.repayValidationFail')
        };

        const feeData: feeData = calculate(borrowField, salaryField, percRepayField, errorFields);
        if (feeData) outputLoanCalculations(outputTo, feeData);
    })
})();