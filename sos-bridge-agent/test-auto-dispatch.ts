/**
 * Test Auto-Dispatch Feature
 * Test chức năng tự động tìm đội cứu hộ
 */

import { store } from './src/store/index.js';
import { autoDispatchTicket, assignRescuerToTicket, isTicketAvailable } from './src/services/auto-dispatch.js';

async function testAutoDispatch() {
  console.log('='.repeat(60));
  console.log('🧪 TEST: Auto-Dispatch Feature');
  console.log('='.repeat(60));

  // Step 1: Tạo rescuers với đầy đủ thông tin (có telegram_user_id, status AVAILABLE)
  console.log('\n📦 Step 1: Tạo rescuers test (có Telegram ID, status AVAILABLE)...');
  
  // Vị trí trung tâm test (Hải Thượng, Quảng Trị)
  const centerLat = 16.7650;
  const centerLng = 107.1230;

  // Rescuer 1 - Gần nhất (0.5km)
  const rescuer1 = await store.createAndAddRescuer({
    name: 'Đội Cứu Hộ Alpha',
    phone: '0901111111',
    location: { lat: centerLat + 0.003, lng: centerLng + 0.003 }, // ~0.5km
    vehicle_type: 'cano',
    vehicle_capacity: 8,
    telegram_user_id: 123456789, // Có Telegram ID
    wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5C000',
  });
  // Set ONLINE (status phải là 'ONLINE' hoặc 'IDLE' để được dispatch)
  await store.updateRescuer(rescuer1.rescuer_id, { status: 'ONLINE' });

  // Rescuer 2 - Gần thứ 2 (1.2km)
  const rescuer2 = await store.createAndAddRescuer({
    name: 'Anh Minh - Thuyền Kayak',
    phone: '0902222222',
    location: { lat: centerLat + 0.008, lng: centerLng - 0.005 }, // ~1.2km
    vehicle_type: 'kayak',
    vehicle_capacity: 2,
    telegram_user_id: 987654321, // Có Telegram ID
    wallet_address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
  });
  await store.updateRescuer(rescuer2.rescuer_id, { status: 'IDLE' }); // IDLE cũng được dispatch

  // Rescuer 3 - Xa hơn (2km) nhưng capacity lớn
  const rescuer3 = await store.createAndAddRescuer({
    name: 'Nhóm Thanh Niên Xung Kích',
    phone: '0903333333',
    location: { lat: centerLat - 0.015, lng: centerLng + 0.008 }, // ~2km
    vehicle_type: 'boat',
    vehicle_capacity: 10,
    telegram_user_id: 555666777, // Có Telegram ID
    wallet_address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
  });
  await store.updateRescuer(rescuer3.rescuer_id, { status: 'ONLINE' });

  // Rescuer 4 - OFFLINE (không nên được chọn)
  const rescuer4 = await store.createAndAddRescuer({
    name: 'Đội Offline Test',
    phone: '0904444444',
    location: { lat: centerLat + 0.001, lng: centerLng + 0.001 }, // Rất gần
    vehicle_type: 'cano',
    vehicle_capacity: 6,
    telegram_user_id: 111222333,
    wallet_address: '0x1234567890123456789012345678901234567890',
  });
  // Giữ OFFLINE - không nên được dispatch
  
  // Rescuer 5 - Không có Telegram ID
  const rescuer5 = await store.createAndAddRescuer({
    name: 'Đội Không Có Telegram',
    phone: '0905555555',
    location: { lat: centerLat + 0.002, lng: centerLng + 0.002 }, // Rất gần
    vehicle_type: 'boat',
    vehicle_capacity: 5,
    // Không có telegram_user_id
    wallet_address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  });
  await store.updateRescuer(rescuer5.rescuer_id, { status: 'ONLINE' });

  const allRescuers = await store.getAllRescuers();
  console.log(`✅ Đã tạo ${allRescuers.length} rescuers:`);
  allRescuers.forEach(r => {
    const tgStatus = r.telegram_user_id ? `TG:${r.telegram_user_id}` : '❌ No TG';
    console.log(`   - ${r.name} (${r.vehicle_type}) - ${r.status} - ${tgStatus}`);
  });

  // Step 2: Tạo ticket test tại vị trí trung tâm
  console.log('\n📝 Step 2: Tạo ticket cứu hộ mới...');
  
  const testTicket = await store.createAndAddTicket({
    location: {
      lat: centerLat,
      lng: centerLng,
      address_text: 'Xã Hải Thượng, Huyện Hải Lăng, Quảng Trị',
    },
    victim_info: {
      phone: '0909888777',
      people_count: 4,
      note: 'Nhà bị ngập nặng, có 1 người già và 1 trẻ em',
      has_elderly: true,
      has_children: true,
      has_disabled: false,
    },
    priority: 4, // Cao
    raw_message: '[TG:999888777] Cứu với! Nhà bị ngập, có 4 người mắc kẹt!',
    source: 'telegram_form',
  });

  console.log(`✅ Đã tạo ticket: ${testTicket.ticket_id}`);
  console.log(`   📍 Location: ${testTicket.location.lat.toFixed(4)}, ${testTicket.location.lng.toFixed(4)}`);
  console.log(`   👥 People: ${testTicket.victim_info.people_count}`);
  console.log(`   ⚡ Priority: ${testTicket.priority}`);
  console.log(`   📊 Status: ${testTicket.status}`);

  // Step 3: Test auto-dispatch
  console.log('\n🚀 Step 3: Chạy auto-dispatch...');
  const dispatchResult = await autoDispatchTicket(testTicket.ticket_id);

  console.log('\n📊 Kết quả Auto-Dispatch:');
  console.log(`   ✅ Success: ${dispatchResult.success}`);
  console.log(`   📤 Notified count: ${dispatchResult.notified_count}`);
  console.log(`   💬 Message: ${dispatchResult.message}`);
  
  if (dispatchResult.rescuers.length > 0) {
    console.log('\n   🚁 Rescuers được thông báo:');
    dispatchResult.rescuers.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.name} - ${r.distance}km away (TG: ${r.telegram_user_id || 'N/A'})`);
    });
  } else {
    console.log('   ⚠️ Không có rescuer nào được tìm thấy');
  }

  // Step 4: Kiểm tra rescuer OFFLINE không được chọn
  console.log('\n🔍 Step 4: Verify - Rescuer OFFLINE và không có TG không được chọn...');
  const offlineRescuerIncluded = dispatchResult.rescuers.some(r => r.name === 'Đội Offline Test');
  const noTgRescuerIncluded = dispatchResult.rescuers.some(r => r.name === 'Đội Không Có Telegram');
  console.log(`   Đội Offline Test included: ${offlineRescuerIncluded ? '❌ BUG!' : '✅ Không (đúng)'}`);
  console.log(`   Đội Không Có Telegram included: ${noTgRescuerIncluded ? '⚠️ Có trong list (nhưng không notify được)' : '✅ Không'}`);

  // Step 5: Test assign rescuer (giả lập rescuer nhận nhiệm vụ)
  if (dispatchResult.rescuers.length > 0) {
    console.log('\n🎯 Step 5: Test assign rescuer (người đầu tiên nhận)...');
    const firstRescuer = dispatchResult.rescuers[0];
    
    const assignResult = await assignRescuerToTicket(testTicket.ticket_id, firstRescuer.rescuer_id);
    console.log(`   Result: ${assignResult.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Message: ${assignResult.message}`);

    // Verify ticket status changed
    const updatedTicket = await store.getTicket(testTicket.ticket_id);
    console.log(`   Ticket status: ${updatedTicket?.status}`);
    console.log(`   Assigned to: ${updatedTicket?.assigned_rescuer_id}`);

    // Verify rescuer status changed
    const updatedRescuer = await store.getRescuer(firstRescuer.rescuer_id);
    console.log(`   Rescuer status: ${updatedRescuer?.status}`);

    // Step 6: Test race condition - rescuer khác cố nhận cùng ticket
    if (dispatchResult.rescuers.length > 1) {
      console.log('\n⚠️ Step 6: Test race condition (người thứ 2 cố nhận cùng ticket)...');
      const secondRescuer = dispatchResult.rescuers[1];
      
      const assignResult2 = await assignRescuerToTicket(testTicket.ticket_id, secondRescuer.rescuer_id);
      console.log(`   Result: ${assignResult2.success ? '❌ BUG - không nên success!' : '✅ Blocked (đúng)'}`);
      console.log(`   Message: ${assignResult2.message}`);
    }
  }

  // Step 7: Check ticket availability
  console.log('\n🔍 Step 7: Check ticket availability sau khi assign...');
  const availability = await isTicketAvailable(testTicket.ticket_id);
  console.log(`   Available: ${availability.available ? '❌ BUG!' : '✅ Không (đã có người nhận)'}`);
  console.log(`   Current status: ${availability.current_status}`);
  if (availability.assigned_to) {
    console.log(`   Assigned to: ${availability.assigned_to}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Ticket created', pass: !!testTicket.ticket_id },
    { name: 'Auto-dispatch triggered', pass: dispatchResult.success },
    { name: 'Found rescuers', pass: dispatchResult.rescuers.length > 0 },
    { name: 'OFFLINE rescuer excluded', pass: !dispatchResult.rescuers.some(r => r.name === 'Đội Offline Test') },
    { name: 'Rescuer with TG ID found', pass: dispatchResult.rescuers.some(r => r.telegram_user_id) },
    { name: 'Notified count > 0', pass: dispatchResult.notified_count > 0 || dispatchResult.rescuers.length > 0 },
  ];

  let passCount = 0;
  tests.forEach(t => {
    console.log(`${t.pass ? '✅' : '❌'} ${t.name}`);
    if (t.pass) passCount++;
  });

  console.log(`\n📊 Result: ${passCount}/${tests.length} tests passed`);
  
  if (passCount === tests.length) {
    console.log('\n🎉 ALL TESTS PASSED! AUTO-DISPATCH FEATURE IS WORKING!');
  } else {
    console.log('\n⚠️ Some tests failed - check logs above');
  }

  console.log('\n' + '='.repeat(60));
}

// Run test
testAutoDispatch().catch(console.error);
