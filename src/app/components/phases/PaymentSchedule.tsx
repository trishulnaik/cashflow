'use client';

import React, { useState } from 'react';
import styles from '../GameLayout.module.css';

interface PaymentScheduleProps {
  handleTransaction: (amount: number) => void;
  isGameOver?: boolean;
  addXP?: (amount: number, reason?: string) => void;
  addBadDecision?: () => void;
  onSubmitPlan?: () => void;
  cashBalance?: number;
}

interface Payment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

export default function PaymentSchedule({ 
  handleTransaction, 
  isGameOver = false, 
  addXP = () => {}, 
  addBadDecision = () => {},
  onSubmitPlan = () => {},
  cashBalance = 200000
}: PaymentScheduleProps) {
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: '1',
      name: 'Mortgage',
      amount: 150,
      dueDate: '2023-07-15',
      isPaid: false
    },
    {
      id: '2',
      name: 'Car Loan',
      amount: 75,
      dueDate: '2023-07-18',
      isPaid: false
    },
    {
      id: '3',
      name: 'Credit Card',
      amount: 50,
      dueDate: '2023-07-20',
      isPaid: false
    },
    {
      id: '4',
      name: 'Utilities',
      amount: 35,
      dueDate: '2023-07-25',
      isPaid: false
    }
  ]);

  const handlePayment = (id: string) => {
    if (isGameOver) return;
    
    const payment = payments.find(payment => payment.id === id);
    if (!payment || payment.isPaid) return;
    
    if (cashBalance - payment.amount < 50000) {
      addXP(-25, 'Warning: Reserve would fall below ₹50,000');
      addBadDecision();
      return;
    }
    
    handleTransaction(-payment.amount);
    
    setPayments(prevPayments => 
      prevPayments.map(p => 
        p.id === id ? { ...p, isPaid: true } : p
      )
    );
  };

  const handlePayAll = () => {
    if (isGameOver) return;
    
    const amountToPay = payments
      .filter(payment => !payment.isPaid)
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    if (cashBalance - amountToPay < 50000) {
      addXP(-25, 'Warning: Reserve would fall below ₹50,000');
      addBadDecision();
      return;
    }
    
    handleTransaction(-amountToPay);
    
    setPayments(prevPayments => 
      prevPayments.map(payment => ({
        ...payment,
        isPaid: true
      }))
    );
    
    const onTimePayments = payments.filter(payment => !payment.isPaid).length;
    if (onTimePayments >= 2) {
      addXP(30, 'Paid at least 2 vendors on time');
    }
  };

  return (
    <div className={styles.phaseContent}>
      <h1>Payment Schedule</h1>
      <p>Manage your payment schedules and cash flow.</p>
      
      <div className={styles.paymentScheduleHeader}>
        <h2>Upcoming Payments</h2>
        <div className={styles.headerButtons}>
          <button onClick={handlePayAll} disabled={isGameOver}>
            Pay All
          </button>
          <button 
            onClick={onSubmitPlan} 
            disabled={isGameOver}
            className={styles.submitPlanButton}
          >
            Submit Plan
          </button>
        </div>
      </div>
      
      <div className={styles.paymentsTable}>
        <div className={styles.tableHeader}>
          <div>Payment</div>
          <div>Amount</div>
          <div>Due Date</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        
        {payments.map(payment => (
          <div key={payment.id} className={styles.tableRow}>
            <div data-label="Payment">{payment.name}</div>
            <div data-label="Amount">${payment.amount}</div>
            <div data-label="Due Date">{payment.dueDate}</div>
            <div data-label="Status" className={payment.isPaid ? styles.paidStatus : styles.unpaidStatus}>
              {payment.isPaid ? 'Paid' : 'Unpaid'}
            </div>
            <div data-label="Action">
              {!payment.isPaid && (
                <button 
                  onClick={() => handlePayment(payment.id)} 
                  disabled={isGameOver}
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 