const app = {
    data: {
        students: [], 
        items: []     
    },
    currentStudent: null,

    init: () => {
        app.loadData();
        app.nav('home');
    },

    loadData: () => {
        const s = localStorage.getItem('mathLabStudents');
        const i = localStorage.getItem('mathLabItems');
        if (s) app.data.students = JSON.parse(s);
        if (i) app.data.items = JSON.parse(i);
    },

    saveData: () => {
        localStorage.setItem('mathLabStudents', JSON.stringify(app.data.students));
        localStorage.setItem('mathLabItems', JSON.stringify(app.data.items));
    },

    // --- Navigation ---
    nav: (pageId) => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
        if(pageId === 'students') app.renderStudents();
        if(pageId === 'items') app.renderItems();
    },

    // --- Student Logic ---
    saveNewStudent: (e) => {
        e.preventDefault();
        const name = document.getElementById('new-student-name').value;
        const netId = document.getElementById('new-student-netid').value;
        const phone = document.getElementById('new-student-phone').value;

        if (app.data.students.find(s => s.netId === netId)) {
            alert('A student with this NetID already exists.');
            return;
        }

        app.data.students.unshift({ name, netId, phone, timestamp: Date.now() });
        app.saveData();
        e.target.reset();
        app.nav('students');
        app.openPersonModal(netId);
    },

    renderStudents: () => {
        const query = document.getElementById('search-students').value.toLowerCase();
        const list = document.getElementById('student-list');
        list.innerHTML = '';

        const filtered = app.data.students.filter(s => 
            s.name.toLowerCase().includes(query) || 
            s.netId.toLowerCase().includes(query) ||
            s.phone.includes(query)
        );

        filtered.forEach(s => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div>
                    <strong>${s.name}</strong><br>
                    <small style="color:#64748b">${s.netId} | ${s.phone}</small>
                </div>
                <button class="btn-secondary" onclick="app.openPersonModal('${s.netId}')">View</button>
            `;
            list.appendChild(div);
        });
    },

    // --- Item Logic ---
    saveNewItem: (e) => {
        e.preventDefault();
        const name = document.getElementById('new-item-name').value;
        const number = document.getElementById('new-item-number').value;

        if (app.data.items.find(i => i.number === number)) {
            alert('Item Number must be unique.');
            return;
        }

        app.data.items.unshift({ name, number, checkedOutTo: null, timestamp: Date.now() });
        app.saveData();
        e.target.reset();
        alert(`"${name}" added to Inventory`);
    },

    renderItems: () => {
        const query = document.getElementById('search-items').value.toLowerCase();
        const list = document.getElementById('item-list');
        list.innerHTML = '';

        const filtered = app.data.items.filter(i => 
            i.name.toLowerCase().includes(query) || 
            i.number.toLowerCase().includes(query)
        );

        filtered.forEach(i => {
            const div = document.createElement('div');
            div.className = 'list-item';
            
            const statusBadge = i.checkedOutTo 
                ? `<span style="background:#fee2e2; color:#ef4444; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:bold;">Checked Out</span>` 
                : `<span style="background:#d1fae5; color:#10b981; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:bold;">Available</span>`;

            div.innerHTML = `
                <div><strong>${i.name}</strong> <small>(#${i.number})</small></div> 
                ${statusBadge}
            `;
            div.onclick = () => app.openItemModal(i.number);
            list.appendChild(div);
        });
    },

    // --- Modals & Popups ---
    
    // 1. Person Popup & Delete
    openPersonModal: (netId) => {
        const student = app.data.students.find(s => s.netId === netId);
        if (!student) return;
        app.currentStudent = student;

        const container = document.getElementById('person-info-display');
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h2 style="margin:0; border:none;">${student.name}</h2>
                    <p style="margin:5px 0; color:#64748b">NetID: ${student.netId}</p>
                    <p style="margin:0; color:#64748b">Phone: ${student.phone}</p>
                </div>
                <button class="btn-green" onclick="app.editPerson('${student.netId}')">Edit</button>
            </div>
        `;
        
        // Add Delete Button Logic specifically for this modal
        const existingDeleteBtn = document.getElementById('btn-delete-person-placeholder');
        if(existingDeleteBtn) existingDeleteBtn.remove();
        
        // We append the delete button at the very bottom
        const deleteBtnHtml = `
            <button class="btn-delete" id="btn-delete-person-placeholder" 
            onclick="app.deletePerson('${student.netId}')">Delete Student</button>
        `;

        app.renderPersonCheckoutList();
        
        // Inject delete button at the end of content
        document.querySelector('#modal-person .modal-content').insertAdjacentHTML('beforeend', deleteBtnHtml);
        document.getElementById('modal-person').classList.remove('hidden');
    },

    deletePerson: (netId) => {
        if(!confirm(`DELETE STUDENT?\n\nThis will return all items checked out to ${netId} and permanently delete the student record.`)) return;

        // 1. Return all items
        app.data.items.forEach(i => {
            if (i.checkedOutTo === netId) {
                i.checkedOutTo = null;
            }
        });

        // 2. Delete Student
        app.data.students = app.data.students.filter(s => s.netId !== netId);

        app.saveData();
        
        // Cleanup UI
        document.getElementById('btn-delete-person-placeholder').remove();
        app.closeModal('modal-person');
        app.renderStudents();
    },

    renderPersonCheckoutList: () => {
        const list = document.getElementById('person-checkout-list');
        list.innerHTML = '';
        const myItems = app.data.items.filter(i => i.checkedOutTo === app.currentStudent.netId);

        if (myItems.length === 0) {
            list.innerHTML = `<p style="text-align:center; color:#94a3b8; margin-top:20px;">No items checked out.</p>`;
        }

        myItems.forEach(i => {
            const pill = document.createElement('div');
            pill.className = 'checkout-item-pill';
            pill.innerHTML = `
                <span>${i.name} (#${i.number})</span>
                <button class="btn-remove" onclick="app.returnItem('${i.number}')">✕</button>
            `;
            list.appendChild(pill);
        });
    },

    editPerson: (netId) => {
        const student = app.data.students.find(s => s.netId === netId);
        const newName = prompt("Edit Name:", student.name);
        const newPhone = prompt("Edit Phone:", student.phone);
        if (newName && newPhone) {
            student.name = newName;
            student.phone = newPhone;
            app.saveData();
            // Refresh
            document.getElementById('btn-delete-person-placeholder').remove();
            app.openPersonModal(netId);
            app.renderStudents(); 
        }
    },

    // 2. Item Popup & Delete
    openItemModal: (number) => {
        const item = app.data.items.find(i => i.number === number);
        const container = document.getElementById('item-info-display');
        const holder = item.checkedOutTo 
            ? app.data.students.find(s => s.netId === item.checkedOutTo)
            : null;

        let linkSectionHtml = '';
        if (holder) {
            linkSectionHtml = `
                <div style="background:#fff1f2; border:1px solid #fecdd3; padding:15px; border-radius:8px; margin-top:20px;">
                    <h4 style="margin-top:0; color:#be123c">Currently Linked To:</h4>
                    <p><strong>${holder.name}</strong></p>
                    <p>${holder.netId}</p>
                    <button class="btn-secondary" style="background:#be123c; width:100%" onclick="app.returnItemFromItemPage('${item.number}')">
                        Return Item (Unlink)
                    </button>
                </div>
            `;
        } else {
            linkSectionHtml = `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:8px; margin-top:20px; text-align:center;">
                    <h4 style="margin:0; color:#15803d">Status: Available</h4>
                    <p style="font-size:0.9rem; color:#64748b">To link this item, go to a Student's page.</p>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h2 style="margin:0; border:none;">${item.name}</h2>
                    <p style="margin:5px 0; color:#64748b">Item #: ${item.number}</p>
                </div>
                <button class="btn-green" onclick="app.editItem('${item.number}')">Edit</button>
            </div>
            ${linkSectionHtml}
            <button class="btn-delete" onclick="app.deleteItem('${item.number}')">Delete Item</button>
        `;
        document.getElementById('modal-item').classList.remove('hidden');
    },

    deleteItem: (number) => {
        if(!confirm(`DELETE ITEM?\n\nIf this item is checked out, it will be unlinked from the student.`)) return;
        
        app.data.items = app.data.items.filter(i => i.number !== number);
        app.saveData();
        app.closeModal('modal-item');
        app.renderItems();
    },

    editItem: (number) => {
        const item = app.data.items.find(i => i.number === number);
        const newName = prompt("Edit Item Name:", item.name);
        if (newName) {
            item.name = newName;
            app.saveData();
            app.openItemModal(number);
            app.renderItems();
        }
    },

    // 3. Shared Logic
    returnItem: (itemNumber) => {
        if(!confirm("Return this item?")) return;
        const item = app.data.items.find(i => i.number === itemNumber);
        item.checkedOutTo = null;
        app.saveData();
        app.renderPersonCheckoutList();
    },

    returnItemFromItemPage: (itemNumber) => {
        if(!confirm("Return this item?")) return;
        const item = app.data.items.find(i => i.number === itemNumber);
        item.checkedOutTo = null;
        app.saveData();
        app.openItemModal(itemNumber); // Refresh item view
        app.renderItems(); // Refresh background list
    },

    // 4. Search & Link
    openItemSearchModal: () => {
        document.getElementById('modal-person').classList.add('hidden');
        document.getElementById('modal-item-search').classList.remove('hidden');
        document.getElementById('search-checkout-items').value = '';
        app.renderCheckoutSearch();
    },

    closeItemSearchModal: () => {
        document.getElementById('modal-item-search').classList.add('hidden');
        document.getElementById('modal-person').classList.remove('hidden');
    },

    renderCheckoutSearch: () => {
        const query = document.getElementById('search-checkout-items').value.toLowerCase();
        const list = document.getElementById('checkout-search-list');
        list.innerHTML = '';

        const available = app.data.items.filter(i => 
            !i.checkedOutTo && 
            (i.name.toLowerCase().includes(query) || i.number.toLowerCase().includes(query))
        );

        if (available.length === 0) {
            list.innerHTML = `<p style="text-align:center; padding:20px; color:#94a3b8">No available items found.</p>`;
        }

        available.forEach(i => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<strong>${i.name}</strong> <small>(#${i.number})</small>`;
            div.onclick = () => app.checkoutItem(i.number);
            list.appendChild(div);
        });
    },

    checkoutItem: (itemNumber) => {
        const item = app.data.items.find(i => i.number === itemNumber);
        item.checkedOutTo = app.currentStudent.netId; 
        app.saveData();
        app.closeItemSearchModal();
        app.renderPersonCheckoutList(); 
    },

    // 5. Quick Add
    openQuickItemAdd: () => {
        document.getElementById('modal-quick-item').classList.remove('hidden');
    },

    saveQuickItem: (e) => {
        e.preventDefault();
        const name = document.getElementById('quick-item-name').value;
        const number = document.getElementById('quick-item-number').value;

        if (app.data.items.find(i => i.number === number)) {
            alert('Item Number exists.');
            return;
        }

        app.data.items.unshift({ name, number, checkedOutTo: app.currentStudent.netId, timestamp: Date.now() });
        app.saveData();
        e.target.reset();
        document.getElementById('modal-quick-item').classList.add('hidden');
        app.renderPersonCheckoutList();
    },

    closeModal: (id) => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        
        // Safety cleanup for dynamically added buttons
        if(id === 'modal-person') {
            const btn = document.getElementById('btn-delete-person-placeholder');
            if(btn) btn.remove();
        }
    }
};

app.init();
