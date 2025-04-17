'use client';

import React, { useState, useEffect } from 'react';
import styles from '../GameLayout.module.css';

interface DashboardProps {
  handleTransaction: (amount: number) => void;
  isGameOver?: boolean;
  addCorrectPriority?: () => void;
  addBadDecision?: () => void;
  addXP?: (amount: number, reason?: string) => void;
  payments?: PaymentItem[];
  setPayments?: React.Dispatch<React.SetStateAction<PaymentItem[]>>;
  cashBalance?: number;
}

interface PaymentItem {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  priority: 'none' | 'high' | 'medium' | 'low';
  type: 'receivable' | 'payable';
}

export default function Dashboard({ 
  handleTransaction, 
  isGameOver = false,
  addCorrectPriority = () => {},
  addBadDecision = () => {},
  addXP = () => {},
  payments: propPayments,
  setPayments: propSetPayments,
  cashBalance = 200000
}: DashboardProps) {
  // Use provided payments state or fallback to local state
  const [localPayments, setLocalPayments] = useState<PaymentItem[]>([
    {
      id: '1',
      name: 'Client ABC',
      amount: 20000,
      dueDate: '2023-08-10',
      priority: 'none',
      type: 'receivable'
    },
    {
      id: '2',
      name: 'Client XYZ',
      amount: 30000,
      dueDate: '2023-08-15',
      priority: 'none',
      type: 'receivable'
    },
    {
      id: '3',
      name: 'Supplier 123',
      amount: 150000,
      dueDate: '2023-08-05',
      priority: 'none',
      type: 'payable'
    },
    {
      id: '4',
      name: 'Office Rent',
      amount: 100000,
      dueDate: '2023-08-01',
      priority: 'none',
      type: 'payable'
    },
    {
      id: '5',
      name: 'Utilities',
      amount: 40000,
      dueDate: '2023-08-12',
      priority: 'none',
      type: 'payable'
    },
    {
      id: '6',
      name: 'Staff Salaries',
      amount: 30000,
      dueDate: '2023-08-28',
      priority: 'none',
      type: 'payable'
    },
  ]);

  // Use the provided payments or the local state
  const paymentsToUse = propPayments && propPayments.length > 0 ? propPayments : localPayments;
  const setPaymentsToUse = propSetPayments || setLocalPayments;
  
  // Synchronize between local state and prop state
  useEffect(() => {
    if (propPayments && propPayments.length > 0) {
      setLocalPayments(propPayments);
    }
  }, [propPayments]);

  // Correct priority mapping for validation
  const correctPriorities: Record<string, 'high' | 'medium' | 'low'> = {
    '3': 'high',   // Supplier payment - high priority due to early due date
    '4': 'high',   // Office rent - high priority due to earliest due date
    '5': 'medium', // Utilities - medium priority
    '6': 'low',    // Staff salaries - low priority due to later due date
    '1': 'medium', // Client ABC - medium priority receivable
    '2': 'low',    // Client XYZ - low priority due to later due date
  };

  const setPriority = (id: string, priority: 'high' | 'medium' | 'low') => {
    if (isGameOver) return;
    
    setPaymentsToUse(prevPayments => 
      prevPayments.map(payment => 
        payment.id === id 
          ? { ...payment, priority } 
          : payment
      )
    );

    // Check if the priority tag is correct and award XP
    if (correctPriorities[id] === priority) {
      addCorrectPriority();
    } else {
      // Penalize for incorrect priority
      addBadDecision();
    }
  };

  // Process a payment or collect a receivable
  const processPayment = (id: string) => {
    if (isGameOver) return;
    
    const payment = paymentsToUse.find(p => p.id === id);
    if (!payment) return;
    
    // For receivables, add the amount; for payables, subtract the amount
    const amount = payment.type === 'receivable' ? payment.amount : -payment.amount;
    handleTransaction(amount);
    
    // Create a new array without the processed payment
    const updatedPayments = paymentsToUse.filter(p => p.id !== id);
    
    // If we're using props, update the parent state
    if (propSetPayments) {
      propSetPayments(updatedPayments);
    }
    
    // Always update local state to ensure UI reflects changes immediately
    setLocalPayments(updatedPayments);
    
    // Add XP for completing a transaction
    const actionType = payment.type === 'receivable' ? 'collected' : 'paid';
    addXP(10, `Successfully ${actionType} ${payment.name}`);
  };

  // Calculate financial summary
  const receivables = paymentsToUse.filter(p => p.type === 'receivable');
  const payables = paymentsToUse.filter(p => p.type === 'payable');
  
  // Calculate actual totals based on the current payments data
  const totalReceivables = receivables.reduce((sum, r) => sum + r.amount, 0);
  const totalPayables = payables.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className={styles.phaseContent}>
      <h1>Financial Dashboard</h1>
      
      <div className={styles.financialSummary}>
        <div className={`${styles.summaryCard} ${styles.cashCard}`}>
          <h2>Current Cash</h2>
          <div className={styles.summaryAmount}>₹{cashBalance.toLocaleString()}</div>
        </div>
        
        <div className={`${styles.summaryCard} ${styles.receivablesCard}`}>
          <h2>Incoming Receivables</h2>
          <div className={styles.summaryAmount}>₹{totalReceivables.toLocaleString()}</div>
        </div>
        
        <div className={`${styles.summaryCard} ${styles.payablesCard}`}>
          <h2>Outgoing Payables</h2>
          <div className={styles.summaryAmount}>₹{totalPayables.toLocaleString()}</div>
        </div>
      </div>
      
      <div className={styles.dashboardTabs}>
        <h2>Payment Prioritization</h2>
        <p>Tag payments as High, Medium, or Low priority. Earn 30 XP for each correct prioritization.</p>
      </div>
      
      <div className={styles.paymentsContainer}>
        <div className={styles.paymentsSection}>
          <h3>Receivables</h3>
          <div className={styles.paymentsTable}>
            <div className={styles.tableHeader}>
              <div>Name</div>
              <div>Amount</div>
              <div>Due Date</div>
              <div>Priority</div>
              <div>Actions</div>
            </div>
            
            {receivables.map(payment => (
              <div key={payment.id} className={styles.tableRow}>
                <div>{payment.name}</div>
                <div data-label="Amount">₹{payment.amount.toLocaleString()}</div>
                <div data-label="Due Date">{payment.dueDate}</div>
                <div data-label="Priority" className={`${styles.priority} ${payment.priority !== 'none' ? styles[payment.priority] : ''}`}>
                  {payment.priority !== 'none' ? payment.priority.toUpperCase() : 'Not Set'}
                </div>
                <div data-label="Actions" className={styles.priorityActions}>
                  <button 
                    onClick={() => setPriority(payment.id, 'high')} 
                    disabled={isGameOver || payment.priority === 'high'}
                    className={payment.priority === 'high' ? styles.activeBtn : ''}
                  >
                    High
                  </button>
                  <button 
                    onClick={() => setPriority(payment.id, 'medium')} 
                    disabled={isGameOver || payment.priority === 'medium'}
                    className={payment.priority === 'medium' ? styles.activeBtn : ''}
                  >
                    Medium
                  </button>
                  <button 
                    onClick={() => setPriority(payment.id, 'low')} 
                    disabled={isGameOver || payment.priority === 'low'}
                    className={payment.priority === 'low' ? styles.activeBtn : ''}
                  >
                    Low
                  </button>
                  <button
                    onClick={() => processPayment(payment.id)}
                    disabled={isGameOver}
                    className={styles.collectBtn}
                  >
                    Collect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.paymentsSection}>
          <h3>Payables</h3>
          <div className={styles.paymentsTable}>
            <div className={styles.tableHeader}>
              <div>Name</div>
              <div>Amount</div>
              <div>Due Date</div>
              <div>Priority</div>
              <div>Actions</div>
            </div>
            
            {payables.map(payment => (
              <div key={payment.id} className={styles.tableRow}>
                <div>{payment.name}</div>
                <div data-label="Amount">₹{payment.amount.toLocaleString()}</div>
                <div data-label="Due Date">{payment.dueDate}</div>
                <div data-label="Priority" className={`${styles.priority} ${payment.priority !== 'none' ? styles[payment.priority] : ''}`}>
                  {payment.priority !== 'none' ? payment.priority.toUpperCase() : 'Not Set'}
                </div>
                <div data-label="Actions" className={styles.priorityActions}>
                  <button 
                    onClick={() => setPriority(payment.id, 'high')} 
                    disabled={isGameOver || payment.priority === 'high'}
                    className={payment.priority === 'high' ? styles.activeBtn : ''}
                  >
                    High
                  </button>
                  <button 
                    onClick={() => setPriority(payment.id, 'medium')} 
                    disabled={isGameOver || payment.priority === 'medium'}
                    className={payment.priority === 'medium' ? styles.activeBtn : ''}
                  >
                    Medium
                  </button>
                  <button 
                    onClick={() => setPriority(payment.id, 'low')} 
                    disabled={isGameOver || payment.priority === 'low'}
                    className={payment.priority === 'low' ? styles.activeBtn : ''}
                  >
                    Low
                  </button>
                  <button
                    onClick={() => processPayment(payment.id)}
                    disabled={isGameOver}
                    className={styles.payBtn}
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 