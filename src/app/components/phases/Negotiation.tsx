'use client';

import React, { useState, useEffect } from 'react';
import styles from '../GameLayout.module.css';

interface NegotiationProps {
  handleTransaction: (amount: number) => void;
  isGameOver?: boolean;
  addXP?: (amount: number, reason?: string) => void;
  cashBalance?: number;
  addDiscountDecision?: () => void;
  addBadDecision?: () => void;
}

interface Vendor {
  id: string;
  name: string;
  amount: number;
  status: 'pending' | 'paid_full' | 'paid_partial' | 'delayed';
  showOptions: boolean;
}

interface PaymentPlan {
  [vendorId: string]: number;
}

export default function Negotiation({ 
  handleTransaction, 
  isGameOver = false,
  addXP = () => {},
  cashBalance = 200000
}: NegotiationProps) {
  // Vendor data
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: 'v1',
      name: 'Vendor A',
      amount: 110000,
      status: 'pending',
      showOptions: false,
    },
    {
      id: 'v2',
      name: 'Vendor B',
      amount: 90000,
      status: 'pending',
      showOptions: false,
    },
    {
      id: 'v3',
      name: 'Vendor C',
      amount: 120000,
      status: 'pending',
      showOptions: false,
    }
  ]);

  // Payment plan
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>({
    v1: 0,
    v2: 0,
    v3: 0
  });

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [remainingBalance, setRemainingBalance] = useState(cashBalance);
  const [showPaymentPlan, setShowPaymentPlan] = useState(false);

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  // Calculate amount with discount or penalty
  const calculateAmount = (originalAmount: number, isDiscount: boolean) => {
    const rate = 0.1; // 10%
    return isDiscount 
      ? originalAmount - (originalAmount * rate) 
      : originalAmount + (originalAmount * rate);
  };

  // Get total amount for all pending vendors
  const getTotalPendingAmount = () => {
    return vendors
      .filter(v => v.status === 'pending')
      .reduce((total, vendor) => total + vendor.amount, 0);
  };

  // Calculate total payment plan amount
  const getTotalPlanAmount = () => {
    return Object.values(paymentPlan).reduce((sum, amount) => sum + amount, 0);
  };

  // Update remaining balance when payment plan changes
  useEffect(() => {
    const totalPlanned = getTotalPlanAmount();
    setRemainingBalance(cashBalance - totalPlanned);
    
    // Validate if total exceeds cash balance
    if (totalPlanned > cashBalance) {
      setErrors({ total: 'Total payment exceeds available cash balance' });
    } else {
      setErrors({});
    }
  }, [paymentPlan, cashBalance]);

  // Toggle vendor options
  const toggleVendorOptions = (id: string) => {
    if (isGameOver) return;

    setVendors(prevVendors => 
      prevVendors.map(vendor => 
        vendor.id === id
          ? { ...vendor, showOptions: !vendor.showOptions }
          : { ...vendor, showOptions: false }
      )
    );
  };

  // Handle payment options
  const handlePayment = (id: string, paymentType: 'full' | 'partial' | 'delay') => {
    if (isGameOver) return;

    const vendor = vendors.find(v => v.id === id);
    if (!vendor) return;

    let newStatus: 'paid_full' | 'paid_partial' | 'delayed';
    let transactionAmount: number;
    let xpAmount: number;

    switch (paymentType) {
      case 'full':
        newStatus = 'paid_full';
        transactionAmount = -vendor.amount;
        xpAmount = 20; // XP for paying in full
        break;
      case 'partial':
        newStatus = 'paid_partial';
        transactionAmount = -calculateAmount(vendor.amount, true); // With 10% discount
        xpAmount = 30; // XP for negotiating successfully
        break;
      case 'delay':
        newStatus = 'delayed';
        transactionAmount = 0; // No immediate payment
        xpAmount = 10; // XP for making a decision
        break;
    }

    // Update vendor status
    setVendors(prevVendors =>
      prevVendors.map(v =>
        v.id === id
          ? { ...v, status: newStatus, showOptions: false }
          : v
      )
    );

    // Process transaction and award XP
    if (transactionAmount !== 0) {
      handleTransaction(transactionAmount);
    }
    addXP(xpAmount);
  };

  // Handle payment plan input change
  const handlePaymentPlanChange = (id: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    const vendor = vendors.find(v => v.id === id);
    
    if (!vendor) return;
    
    // Validate input
    const fieldErrors = { ...errors };
    delete fieldErrors[id];
    
    if (numValue > vendor.amount) {
      fieldErrors[id] = `Amount cannot exceed ${formatCurrency(vendor.amount)}`;
    } else if (numValue < 0) {
      fieldErrors[id] = 'Amount cannot be negative';
    }
    
    // Update payment plan
    setPaymentPlan({
      ...paymentPlan,
      [id]: numValue
    });
    
    setErrors(fieldErrors);
  };

  // Submit payment plan
  const submitPaymentPlan = () => {
    if (isGameOver || Object.keys(errors).length > 0 || getTotalPlanAmount() === 0) return;

    // Process each vendor payment
    vendors.forEach(vendor => {
      const planAmount = paymentPlan[vendor.id];
      
      if (planAmount > 0) {
        let newStatus: 'paid_full' | 'paid_partial';
        let xpAmount: number;
        
        if (planAmount === vendor.amount) {
          newStatus = 'paid_full';
          xpAmount = 20;
        } else {
          newStatus = 'paid_partial';
          xpAmount = Math.floor((planAmount / vendor.amount) * 30); // Proportional XP
        }
        
        // Update vendor status
        setVendors(prevVendors =>
          prevVendors.map(v =>
            v.id === vendor.id
              ? { ...v, status: newStatus }
              : v
          )
        );
        
        // Award XP
        addXP(xpAmount);
      }
    });
    
    // Process the transaction
    handleTransaction(-getTotalPlanAmount());
    
    // Reset payment plan
    setPaymentPlan({
      v1: 0,
      v2: 0,
      v3: 0
    });
    
    setShowPaymentPlan(false);
  };

  // Get status display text and class
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid_full':
        return { text: 'Paid (Full)', className: styles.statusPaidFull };
      case 'paid_partial':
        return { text: 'Paid (Partial)', className: styles.statusPaidPartial };
      case 'delayed':
        return { text: 'Delayed (+10%)', className: styles.statusDelayed };
      default:
        return { text: 'Pending', className: styles.statusPending };
    }
  };

  return (
    <div className={styles.phaseContent}>
      <h1>Vendor Negotiation</h1>
      
      <div className={styles.negotiationSummary}>
        <div className={styles.summaryCard}>
          <h2>Pending Payments</h2>
          <div className={styles.summaryAmount}>{formatCurrency(getTotalPendingAmount())}</div>
        </div>
        
        <div className={styles.summaryCard}>
          <h2>Cash Balance</h2>
          <div className={styles.summaryAmount}>{formatCurrency(cashBalance)}</div>
        </div>
      </div>
      
      <div className={styles.negotiationActions}>
        <button 
          className={styles.planButton}
          onClick={() => setShowPaymentPlan(!showPaymentPlan)}
          disabled={isGameOver}
        >
          {showPaymentPlan ? 'Hide Payment Plan' : 'Create Payment Plan'}
        </button>
      </div>
      
      {showPaymentPlan && (
        <div className={styles.paymentPlanContainer}>
          <h2>Payment Planning Form</h2>
          <p>Decide how much to pay each vendor. Your remaining balance will update as you plan.</p>
          
          <div className={styles.paymentPlanForm}>
            {vendors.filter(v => v.status === 'pending').map(vendor => (
              <div key={vendor.id} className={styles.planFormRow}>
                <div className={styles.planVendorInfo}>
                  <span className={styles.planVendorName}>{vendor.name}</span>
                  <span className={styles.planVendorAmount}>Total Due: {formatCurrency(vendor.amount)}</span>
                </div>
                <div className={styles.planInputContainer}>
                  <div className={styles.inputWrapper}>
                    <span className={styles.currencySymbol}>₹</span>
                    <input
                      type="number"
                      value={paymentPlan[vendor.id] || ''}
                      onChange={(e) => handlePaymentPlanChange(vendor.id, e.target.value)}
                      min="0"
                      max={vendor.amount}
                      disabled={isGameOver}
                      placeholder="0"
                      className={errors[vendor.id] ? styles.inputError : ''}
                    />
                  </div>
                  {errors[vendor.id] && (
                    <div className={styles.errorMessage}>{errors[vendor.id]}</div>
                  )}
                </div>
              </div>
            ))}
            
            <div className={styles.planSummary}>
              <div className={styles.planTotalRow}>
                <span>Total Payment:</span>
                <span className={styles.planTotal}>{formatCurrency(getTotalPlanAmount())}</span>
              </div>
              <div className={styles.planRemainingRow}>
                <span>Remaining Balance:</span>
                <span className={`${styles.planRemaining} ${remainingBalance < 0 ? styles.negative : ''}`}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
              
              {errors.total && (
                <div className={styles.totalErrorMessage}>{errors.total}</div>
              )}
              
              <button
                className={styles.submitPlanButton}
                onClick={submitPaymentPlan}
                disabled={
                  isGameOver || 
                  Object.keys(errors).length > 0 || 
                  getTotalPlanAmount() === 0 ||
                  getTotalPlanAmount() > cashBalance
                }
              >
                Submit Payment Plan
              </button>
            </div>
          </div>
        </div>
      )}
      
      <p className={styles.negotiationInstructions}>
        Choose how to handle each vendor payment. You can pay in full, negotiate for a 10% discount, 
        or delay the payment with a 10% penalty.
      </p>
      
      <div className={styles.vendorList}>
        {vendors.map(vendor => (
          <div key={vendor.id} className={styles.vendorCard}>
            <div className={styles.vendorHeader} onClick={() => toggleVendorOptions(vendor.id)}>
              <div className={styles.vendorInfo}>
                <h3>{vendor.name}</h3>
                <span className={styles.vendorAmount}>{formatCurrency(vendor.amount)}</span>
              </div>
              <div className={styles.vendorStatus}>
                <span className={getStatusInfo(vendor.status).className}>
                  {getStatusInfo(vendor.status).text}
                </span>
                {vendor.status === 'pending' && (
                  <button 
                    className={styles.viewOptionsBtn}
                    disabled={isGameOver}
                  >
                    {vendor.showOptions ? 'Hide Options' : 'View Options'}
                  </button>
                )}
              </div>
            </div>
            
            {vendor.showOptions && vendor.status === 'pending' && (
              <div className={styles.vendorOptions}>
                <div className={styles.optionCard}>
                  <h4>Pay Now (Full)</h4>
                  <p>Pay the full amount immediately</p>
                  <div className={styles.optionDetails}>
                    <span>Amount: {formatCurrency(vendor.amount)}</span>
                    <span>Earn: 20 XP</span>
                  </div>
                  <button 
                    onClick={() => handlePayment(vendor.id, 'full')}
                    disabled={isGameOver || vendor.amount > cashBalance}
                    className={styles.payBtn}
                  >
                    Pay Full Amount
                  </button>
                </div>
                
                <div className={styles.optionCard}>
                  <h4>Negotiate (10% Discount)</h4>
                  <p>Pay partial amount with a discount</p>
                  <div className={styles.optionDetails}>
                    <span>Amount: {formatCurrency(calculateAmount(vendor.amount, true))}</span>
                    <span>Save: {formatCurrency(vendor.amount * 0.1)}</span>
                    <span>Earn: 30 XP</span>
                  </div>
                  <button 
                    onClick={() => handlePayment(vendor.id, 'partial')}
                    disabled={isGameOver || calculateAmount(vendor.amount, true) > cashBalance}
                    className={styles.negotiateBtn}
                  >
                    Pay Discounted Amount
                  </button>
                </div>
                
                <div className={styles.optionCard}>
                  <h4>Delay Payment (10% Penalty)</h4>
                  <p>Delay payment with a future penalty</p>
                  <div className={styles.optionDetails}>
                    <span>Future Amount: {formatCurrency(calculateAmount(vendor.amount, false))}</span>
                    <span>Penalty: {formatCurrency(vendor.amount * 0.1)}</span>
                    <span>Earn: 10 XP</span>
                  </div>
                  <button 
                    onClick={() => handlePayment(vendor.id, 'delay')}
                    disabled={isGameOver}
                    className={styles.delayBtn}
                  >
                    Delay Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 