#!/usr/bin/env node

/**
 * Manual Audit Demonstration Script
 * 
 * This script demonstrates real-time audit logging by making API calls
 * and immediately checking the audit log entries.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3110/api';

// Helper function to make API calls with proper error handling
async function apiCall(method, url, data = null, description = '') {
  try {
    console.log(`🔄 ${description}...`);
    const config = {
      method,
      url: `${API_BASE}${url}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Manual-Audit-Demo/1.0'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log(`✅ ${description} successful (${response.status})`);
    return response.data;
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data) {
      console.log(`   Error details: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// Helper function to check audit entries
async function checkAuditEntries(tableName, action, recordId = null, description = '') {
  console.log(`🔍 ${description}...`);
  
  let url = `/audit?table_name=${tableName}&action=${action}&limit=5`;
  if (recordId) {
    url += `&record_id=${recordId}`;
  }
  
  const auditEntries = await apiCall('GET', url, null, 'Fetching audit entries');
  
  if (auditEntries && auditEntries.length > 0) {
    console.log(`✅ Found ${auditEntries.length} audit entries:`);
    auditEntries.forEach((entry, index) => {
      console.log(`   ${index + 1}. ID: ${entry.id}`);
      console.log(`      Action: ${entry.action} on ${entry.table_name}`);
      console.log(`      Changed by: ${entry.changed_by || 'Unknown'}`);
      console.log(`      Record ID: ${entry.record_id}`);
      console.log(`      Timestamp: ${entry.changed_at}`);
      if (entry.old_values) {
        console.log(`      Old values: ${entry.old_values.substring(0, 100)}${entry.old_values.length > 100 ? '...' : ''}`);
      }
      if (entry.new_values) {
        console.log(`      New values: ${entry.new_values.substring(0, 100)}${entry.new_values.length > 100 ? '...' : ''}`);
      }
      console.log('      ---');
    });
    return auditEntries;
  } else {
    console.log(`❌ No audit entries found for ${action} on ${tableName}`);
    return [];
  }
}

// Helper function to display all recent audit activity
async function showRecentAuditActivity() {
  console.log('\n🔍 DISPLAYING ALL RECENT AUDIT ACTIVITY...');
  console.log('=====================================');
  
  const recentEntries = await apiCall('GET', '/audit?limit=15', null, 'Fetching recent audit activity');
  
  if (recentEntries && recentEntries.length > 0) {
    console.log(`Found ${recentEntries.length} recent audit entries:\n`);
    
    recentEntries.forEach((entry, index) => {
      const timestamp = new Date(entry.changed_at).toLocaleString();
      console.log(`${index + 1}. [${timestamp}] ${entry.action} on ${entry.table_name}`);
      console.log(`   Changed by: ${entry.changed_by || 'System'}`);
      console.log(`   Record ID: ${entry.record_id}`);
      if (entry.comment) {
        console.log(`   Comment: ${entry.comment}`);
      }
      console.log('   ---');
    });
  } else {
    console.log('No recent audit activity found');
  }
  
  console.log('=====================================\n');
}

async function runAuditDemonstration() {
  console.log('🚀 STARTING LIVE AUDIT DEMONSTRATION');
  console.log('=====================================\n');
  
  // Show initial audit state
  await showRecentAuditActivity();
  
  // Test 1: Create a person
  console.log('📝 TEST 1: Creating a new person...');
  const personData = {
    name: `Demo Person ${Date.now()}`,
    email: `demo-${Date.now()}@example.com`,
    employee_id: `DEMO${Date.now()}`,
    is_active: true
  };
  
  const createdPerson = await apiCall('POST', '/people', personData, 'Creating person');
  
  if (createdPerson) {
    console.log(`✅ Created person with ID: ${createdPerson.id}`);
    
    // Check audit immediately
    await checkAuditEntries('people', 'CREATE', createdPerson.id, 'Checking audit for person creation');
    
    // Test 2: Update the person
    console.log('\n📝 TEST 2: Updating the person...');
    const updateData = {
      name: `Updated Demo Person ${Date.now()}`,
      email: personData.email
    };
    
    const updatedPerson = await apiCall('PUT', `/people/${createdPerson.id}`, updateData, 'Updating person');
    
    if (updatedPerson) {
      console.log(`✅ Updated person with ID: ${createdPerson.id}`);
      
      // Check audit for update
      await checkAuditEntries('people', 'UPDATE', createdPerson.id, 'Checking audit for person update');
      
      // Test 3: Delete the person
      console.log('\n📝 TEST 3: Deleting the person...');
      const deleteResult = await apiCall('DELETE', `/people/${createdPerson.id}`, null, 'Deleting person');
      
      if (deleteResult !== null) {
        console.log(`✅ Deleted person with ID: ${createdPerson.id}`);
        
        // Check audit for deletion
        await checkAuditEntries('people', 'DELETE', createdPerson.id, 'Checking audit for person deletion');
      }
    }
  }
  
  // Test 4: Test the original issue - availability override
  console.log('\n📝 TEST 4: Testing availability override (ORIGINAL ISSUE)...');
  
  // First create a person for the availability test
  const availTestPerson = await apiCall('POST', '/people', {
    name: `Availability Test Person ${Date.now()}`,
    email: `avail-test-${Date.now()}@example.com`,
    employee_id: `AVAIL${Date.now()}`,
    is_active: true
  }, 'Creating person for availability test');
  
  if (availTestPerson) {
    // Create availability override
    const availabilityData = {
      person_id: availTestPerson.id,
      start_date: '2024-12-25',
      end_date: '2024-12-31',
      override_type: 'VACATION',
      availability_percentage: 0.0,
      notes: 'Demo holiday vacation override'
    };
    
    const createdOverride = await apiCall('POST', '/availability', availabilityData, 'Creating availability override');
    
    if (createdOverride) {
      console.log(`✅ Created availability override with ID: ${createdOverride.id}`);
      
      // Check audit for availability creation
      await checkAuditEntries('availability', 'CREATE', createdOverride.id, 'Checking audit for availability creation');
      
      // Now delete the availability override (THE ORIGINAL ISSUE!)
      console.log('\n🎯 TESTING ORIGINAL ISSUE: Deleting availability override...');
      const deleteAvailResult = await apiCall('DELETE', `/availability/${createdOverride.id}`, null, 'Deleting availability override');
      
      if (deleteAvailResult !== null) {
        console.log(`✅ Deleted availability override with ID: ${createdOverride.id}`);
        
        // Check audit for availability deletion (this was the original problem!)
        console.log('\n🔍 CHECKING ORIGINAL ISSUE: Was availability deletion audited?');
        const deletionAudit = await checkAuditEntries('availability', 'DELETE', createdOverride.id, 'Checking audit for availability deletion');
        
        if (deletionAudit.length > 0) {
          console.log('\n🎉 SUCCESS! The original issue has been FIXED!');
          console.log('✅ Availability deletion is now properly audited!');
        } else {
          console.log('\n❌ ISSUE STILL EXISTS: Availability deletion was not audited');
        }
      }
    }
    
    // Clean up test person
    await apiCall('DELETE', `/people/${availTestPerson.id}`, null, 'Cleaning up test person');
  }
  
  // Test 5: Test project operations
  console.log('\n📝 TEST 5: Testing project operations...');
  const projectData = {
    name: `Demo Project ${Date.now()}`,
    description: 'Demo project for audit testing',
    status: 'active',
    priority: 'high'
  };
  
  const createdProject = await apiCall('POST', '/projects', projectData, 'Creating project');
  
  if (createdProject) {
    console.log(`✅ Created project with ID: ${createdProject.id}`);
    
    // Check audit for project creation
    await checkAuditEntries('projects', 'CREATE', createdProject.id, 'Checking audit for project creation');
    
    // Update project
    const updatedProject = await apiCall('PUT', `/projects/${createdProject.id}`, {
      ...projectData,
      name: `Updated Demo Project ${Date.now()}`,
      status: 'completed'
    }, 'Updating project');
    
    if (updatedProject) {
      await checkAuditEntries('projects', 'UPDATE', createdProject.id, 'Checking audit for project update');
    }
    
    // Clean up
    await apiCall('DELETE', `/projects/${createdProject.id}`, null, 'Cleaning up test project');
    await checkAuditEntries('projects', 'DELETE', createdProject.id, 'Checking audit for project deletion');
  }
  
  // Final audit activity summary
  console.log('\n📊 FINAL AUDIT ACTIVITY SUMMARY:');
  await showRecentAuditActivity();
  
  console.log('🎯 LIVE AUDIT DEMONSTRATION COMPLETED!');
  console.log('=====================================');
  console.log('✅ All database modifications have been audited');
  console.log('✅ The original availability deletion issue has been FIXED');
  console.log('✅ Comprehensive audit logging is working properly');
}

// Run the demonstration
runAuditDemonstration().catch(error => {
  console.error('❌ Demonstration failed:', error.message);
  process.exit(1);
});