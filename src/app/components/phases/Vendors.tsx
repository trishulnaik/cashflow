'use client';

import React, { useState } from 'react';
import styles from '../GameLayout.module.css';

interface VendorsProps {
  handleTransaction: (amount: number) => void;
  isGameOver?: boolean;
  addXP?: (amount: number, reason?: string) => void;
  addBadDecision?: () => void;
  vendorStatus?: 'good' | 'tense' | 'bad';
}

interface Vendor {
  id: string;
  name: string;
  relationship: 'good' | 'tense' | 'bad';
  dueAmount: number;
  dueDate: string;
  paymentHistory: {
    date: string;
    amount: number;
    onTime: boolean;
  }[];
  products: string[];
  importance: 'critical' | 'important' | 'standard';
}

export default function Vendors({ 
  handleTransaction, 
  isGameOver = false, 
  addXP = () => {}, 
  addBadDecision = () => {},
  vendorStatus = 'good'
}: VendorsProps) {
  // Vendor list
  const [vendors, setVendors] = useState<Vendor[]>([
    {
      id: '1',
      name: 'Alpha Supplies Inc.',
      relationship: 'good',
      dueAmount: 25000,
      dueDate: '2023-09-15',
      paymentHistory: [
        { date: '2023-08-15', amount: 25000, onTime: true },
        { date: '2023-07-15', amount: 25000, onTime: true }
      ],
      products: ['Raw materials', 'Manufacturing supplies'],
      importance: 'critical'
    },
    {
      id: '2',
      name: 'Beta Logistics',
      relationship: 'tense',
      dueAmount: 18000,
      dueDate: '2023-09-05',
      paymentHistory: [
        { date: '2023-08-05', amount: 18000, onTime: false },
        { date: '2023-07-05', amount: 18000, onTime: true }
      ],
      products: ['Shipping', 'Warehousing'],
      importance: 'important'
    },
    {
      id: '3',
      name: 'Gamma Tech Solutions',
      relationship: 'bad',
      dueAmount: 12000,
      dueDate: '2023-08-30',
      paymentHistory: [
        { date: '2023-07-30', amount: 12000, onTime: false },
        { date: '2023-06-30', amount: 12000, onTime: false }
      ],
      products: ['Software licenses', 'IT support'],
      importance: 'standard'
    }
  ]);
  
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [negotiationOption, setNegotiationOption] = useState<string | null>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  
  // Handle payment to vendor
  const handlePayVendor = (vendorId: string) => {
    if (isGameOver) return;
    
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    
    // Process payment
    handleTransaction(-vendor.dueAmount);
    
    // Update vendor relationship
    const isDueDate = new Date(vendor.dueDate).toDateString() === new Date().toDateString();
    const isEarly = new Date(vendor.dueDate) > new Date();
    
    let relationshipChange = 'none';
    
    if (isEarly) {
      // Early payment improves relationship
      relationshipChange = 'improved';
      addXP(30, 'Early vendor payment');
      
      setVendors(prevVendors => 
        prevVendors.map(v => 
          v.id === vendorId
            ? {
                ...v,
                relationship: v.relationship === 'bad' ? 'tense' : 'good',
                dueAmount: 0,
                paymentHistory: [
                  { date: new Date().toISOString().split('T')[0], amount: v.dueAmount, onTime: true },
                  ...v.paymentHistory
                ]
              }
            : v
        )
      );
    } else if (isDueDate) {
      // On-time payment slightly improves or maintains relationship
      relationshipChange = 'maintained';
      addXP(15, 'On-time vendor payment');
      
      setVendors(prevVendors => 
        prevVendors.map(v => 
          v.id === vendorId
            ? {
                ...v,
                relationship: v.relationship === 'bad' ? 'bad' : v.relationship,
                dueAmount: 0,
                paymentHistory: [
                  { date: new Date().toISOString().split('T')[0], amount: v.dueAmount, onTime: true },
                  ...v.paymentHistory
                ]
              }
            : v
        )
      );
    }
    
    // Show notification
    if (relationshipChange !== 'none') {
      addXP(0, `Vendor relationship ${relationshipChange}`);
    }
  };
  
  // Open negotiation dialog
  const openNegotiation = (vendor: Vendor) => {
    if (isGameOver) return;
    setSelectedVendor(vendor);
    setShowNegotiationModal(true);
  };
  
  // Handle negotiation option selection
  const selectNegotiationOption = (option: string) => {
    setNegotiationOption(option);
  };
  
  // Complete negotiation
  const completeNegotiation = () => {
    if (!selectedVendor || !negotiationOption) return;
    
    switch (negotiationOption) {
      case 'extension':
        // Request payment extension
        if (selectedVendor.relationship === 'good') {
          addXP(25, 'Successfully negotiated payment extension');
          
          // Update due date to 30 days later
          const currentDueDate = new Date(selectedVendor.dueDate);
          currentDueDate.setDate(currentDueDate.getDate() + 30);
          const newDueDate = currentDueDate.toISOString().split('T')[0];
          
          setVendors(prevVendors => 
            prevVendors.map(v => 
              v.id === selectedVendor.id
                ? { ...v, dueDate: newDueDate }
                : v
            )
          );
        } else {
          addXP(-10, 'Failed to negotiate payment extension');
          addBadDecision();
        }
        break;
        
      case 'discount':
        // Request discount
        if (selectedVendor.relationship === 'good') {
          addXP(40, 'Successfully negotiated payment discount');
          
          // Apply 10% discount
          const discountedAmount = selectedVendor.dueAmount * 0.9;
          
          setVendors(prevVendors => 
            prevVendors.map(v => 
              v.id === selectedVendor.id
                ? { ...v, dueAmount: discountedAmount }
                : v
            )
          );
        } else {
          addXP(-15, 'Failed to negotiate payment discount');
          addBadDecision();
        }
        break;
        
      case 'installment':
        // Request installment plan
        if (selectedVendor.relationship !== 'bad') {
          addXP(20, 'Successfully negotiated installment plan');
          
          // Split into 3 payments
          const installmentAmount = selectedVendor.dueAmount / 3;
          
          setVendors(prevVendors => 
            prevVendors.map(v => 
              v.id === selectedVendor.id
                ? { ...v, dueAmount: installmentAmount }
                : v
            )
          );
        } else {
          addXP(-10, 'Failed to negotiate installment plan');
          addBadDecision();
        }
        break;
    }
    
    // Close negotiation modal
    setShowNegotiationModal(false);
    setSelectedVendor(null);
    setNegotiationOption(null);
  };
  
  // Get relationship status label and class
  const getRelationshipClass = (relationship: 'good' | 'tense' | 'bad') => {
    switch (relationship) {
      case 'good': return styles.relationshipGood;
      case 'tense': return styles.relationshipTense;
      case 'bad': return styles.relationshipBad;
      default: return '';
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };
  
  return (
    <div className={styles.phaseContent}>
      <h1>Vendor Management</h1>
      <p>Manage your vendor relationships and payments. Better relationships lead to better terms.</p>
      
      <div className={styles.overallStatus}>
        <h3>Overall Vendor Status: 
          <span className={getRelationshipClass(vendorStatus)}>
            {' '}{vendorStatus.charAt(0).toUpperCase() + vendorStatus.slice(1)}
          </span>
        </h3>
      </div>
      
      <div className={styles.vendorsContainer}>
        {vendors.map(vendor => (
          <div key={vendor.id} className={styles.vendorCard}>
            <div className={styles.vendorHeader}>
              <h3>{vendor.name}</h3>
              <span className={`${styles.vendorRelationship} ${getRelationshipClass(vendor.relationship)}`}>
                {vendor.relationship.charAt(0).toUpperCase() + vendor.relationship.slice(1)}
              </span>
            </div>
            
            <div className={styles.vendorImportance}>
              {vendor.importance === 'critical' && <span className={styles.criticalVendor}>Critical Vendor</span>}
              {vendor.importance === 'important' && <span className={styles.importantVendor}>Important Vendor</span>}
            </div>
            
            <div className={styles.vendorDetails}>
              <div className={styles.vendorDetail}>
                <span>Due Amount:</span>
                <span>{formatCurrency(vendor.dueAmount)}</span>
              </div>
              <div className={styles.vendorDetail}>
                <span>Due Date:</span>
                <span>{vendor.dueDate}</span>
              </div>
              <div className={styles.vendorDetail}>
                <span>Products/Services:</span>
                <span>{vendor.products.join(', ')}</span>
              </div>
            </div>
            
            <div className={styles.vendorActions}>
              <button 
                onClick={() => handlePayVendor(vendor.id)} 
                disabled={isGameOver}
                className={styles.payVendorButton}
              >
                Pay Now {formatCurrency(vendor.dueAmount)}
              </button>
              
              <button 
                onClick={() => openNegotiation(vendor)} 
                disabled={isGameOver}
                className={styles.negotiateButton}
              >
                Negotiate Terms
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Negotiation Modal */}
      {showNegotiationModal && selectedVendor && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Negotiate with {selectedVendor.name}</h2>
            
            <p>Current relationship: 
              <span className={getRelationshipClass(selectedVendor.relationship)}>
                {' '}{selectedVendor.relationship.charAt(0).toUpperCase() + selectedVendor.relationship.slice(1)}
              </span>
            </p>
            
            <p>Select a negotiation option:</p>
            
            <div className={styles.negotiationOptions}>
              <button 
                onClick={() => selectNegotiationOption('extension')}
                className={`${styles.negotiationOption} ${negotiationOption === 'extension' ? styles.selectedOption : ''}`}
              >
                <h3>Request Payment Extension</h3>
                <p>Ask for more time to pay.</p>
                <p className={styles.successChance}>
                  Success chance: {selectedVendor.relationship === 'good' ? 'High' : selectedVendor.relationship === 'tense' ? 'Medium' : 'Low'}
                </p>
              </button>
              
              <button 
                onClick={() => selectNegotiationOption('discount')}
                className={`${styles.negotiationOption} ${negotiationOption === 'discount' ? styles.selectedOption : ''}`}
              >
                <h3>Request Discount</h3>
                <p>Ask for a reduced amount.</p>
                <p className={styles.successChance}>
                  Success chance: {selectedVendor.relationship === 'good' ? 'Medium' : 'Very Low'}
                </p>
              </button>
              
              <button 
                onClick={() => selectNegotiationOption('installment')}
                className={`${styles.negotiationOption} ${negotiationOption === 'installment' ? styles.selectedOption : ''}`}
              >
                <h3>Request Installment Plan</h3>
                <p>Ask to pay in multiple parts.</p>
                <p className={styles.successChance}>
                  Success chance: {selectedVendor.relationship !== 'bad' ? 'Medium' : 'Low'}
                </p>
              </button>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowNegotiationModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              
              <button 
                onClick={completeNegotiation}
                disabled={!negotiationOption}
                className={styles.confirmButton}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 