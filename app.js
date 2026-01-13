const app = {
    data: {
        students: [], // { netId, name, phone, timestamp }
        items: []     // { number, name, checkedOutTo: netId|null, timestamp }
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
        
        // Refresh lists if entering those pages
        if(pageId === 'students') app.renderStudents();
        if(pageId === 'items') app.renderItems();
    },

    // --- Student Logic ---
    saveNewStudent: (e) => {
        e.preventDefault();
        const name = document.getElementById('new-student-name').value;
        const netId = document.getElementById('new-student-netid').value;
        const phone = document.getElementById('new-student-phone').value;

        // Validation: Check duplicate NetID
        if (app.data.students.find(s => s.netId === netId)) {
            alert('A student with this NetID already exists.');
            return;
        }

        const newStudent = { name, netId, phone, timestamp: Date.now() };
        app.data.students.unshift(newStudent); // Add to top of list
        app.saveData();
        
        e.target.reset();

        // Redirect flow: Go to existing students -> Open the new student's popup
        app.nav('students');
        app.openPersonModal(netId);
    },

    renderStudents: () => {
        const query = document.getElementById('search-students').value.toLowerCase();
        const list = document.getElementById('student-list');
        list.innerHTML = '';

        // Search Logic: Includes Name, NetID, OR Phone
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
                    <small style="color:#666">${s.netId} | ${s.phone}</small>
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
        
        // Confirmation feedback
        alert(`"${name}" added to Inventory`);
    },

    renderItems: () => {
        const query = document.getElementById('search-items').value.toLowerCase();
        const list = document.getElementById('item-list');
        list.innerHTML = '';

        // Search Logic: Includes Name OR Number
        const filtered = app.data.items.filter(i => 
            i.name.toLowerCase().includes(query) || 
            i.number.toLowerCase().includes(query)
        );

        filtered.forEach(i => {
            const div = document.createElement('div');
            div.className = 'list-item';
            
            // Visual badge for status
            const statusBadge = i.checkedOutTo 
                ? `<span style="background:var(--red); color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem">Checked Out</span>` 
                : `<span style="background:var(--green); color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem">Available</span>`;

            div.innerHTML = `
                <div><strong>${i.name}</strong> <small>(#${i.number})</small></div> 
                ${statusBadge}
            `;
            div.onclick = () => app.openItemModal(i.number);
            list.appendChild(div);
        });
    },

    // --- Modals & Popups ---
    
    // 1. Person Popup
    openPersonModal: (netId) => {
        const student = app.data.students.find(s => s.netId === netId);
        if (!student) return;
        app.currentStudent = student;

        const container = document.getElementById('person-info-display');
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h2 style="margin:0">${student.name}</h2>
                    <p style="margin:5px 0; color:#555">NetID: ${student.netId}</p>
                    <p style="margin:0; color:#555">Phone: ${student.phone}</p>
                </div>
                <button class="btn-green" onclick="app.editPerson('${student.netId}')">Edit Info</button>
            </div>
        `;

        app.renderPersonCheckoutList();
        document.getElementById('modal-person').classList.remove('hidden');
    },

    renderPersonCheckoutList: () => {
        const list = document.getElementById('person-checkout-list');
        list.innerHTML = '';
        
        // Link Section: Find all items linked to this person
        const myItems = app.data.items.filter(i => i.checkedOutTo === app.currentStudent.netId);

        if (myItems.length === 0) {
            list.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px;">No items checked out.</p>`;
        }

        myItems.forEach(i => {
            const pill = document.createElement('div');
            pill.className = 'checkout-item-pill';
            // Added logic: Clicking the X "unlinks" the item
            pill.innerHTML = `
                <span>${i.name} (#${i.number})</span>
                <button class="btn-remove" onclick="app.returnItem('${i.number}')">X</button>
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
            app.openPersonModal(netId); // refresh display
            app.renderStudents(); // refresh background list
        }
    },

    // 2. Item Popup
    openItemModal: (number) => {
        const item = app.data.items.find(i => i.number === number);
        const container = document.getElementById('item-info-display');
        
        // Check if linked to a person
        const holder = item.checkedOutTo 
            ? app.data.students.find(s => s.netId === item.checkedOutTo)
            : null;

        let linkSectionHtml = '';
        
        if (holder) {
            // LINK SECTION: Linked to a Person
            linkSectionHtml = `
                <div style="background:#fff0f0; border:1px solid #ffcccc; padding:15px; border-radius:8px; margin-top:20px;">
                    <h4 style="margin-top:0; color:var(--red)">Currently Linked To:</h4>
                    <p><strong>${holder.name}</strong></p>
                    <p>${holder.netId} | ${holder.phone}</p>
                    <button class="btn-secondary" style="background:var(--red); width:100%" onclick="app.returnItemFromItemPage('${item.number}')">
                        Return Item (Unlink)
                    </button>
                </div>
            `;
        } else {
            // LINK SECTION: Available
            linkSectionHtml = `
                <div style="background:#f0fff4; border:1px solid #ccffdd; padding:15px; border-radius:8px; margin-top:20px; text-align:center;">
                    <h4 style="margin:0; color:var(--green)">Status: Available</h4>
                    <p style="font-size:0.9rem; color:#666">To link this item, go to a Student's page.</p>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <h2 style="margin:0">${item.name}</h2>
                    <p style="margin:5px 0; color:#555">Item #: ${item.number}</p>
                </div>
                <button class="btn-green" onclick="app.editItem('${item.number}')">Edit Info</button>
            </div>
            ${linkSectionHtml}
        `;
        document.getElementById('modal-item').classList.remove('hidden');
    },

    editItem: (number) => {
        const item = app.data.items.find(i => i.number === number);
        const newName = prompt("Edit Item Name:", item.name);
        if (newName) {
            item.name = newName;
            app.saveData();
            app.openItemModal(number); // refresh popup
            app.renderItems(); // refresh list
        }
    },

    // Shared "Unlink" Logic
    returnItem: (itemNumber) => {
        if(!confirm("Are you sure you want to return this item?")) return;
        const item = app.data.items.find(i => i.number === itemNumber);
        item.checkedOutTo = null;
        app.saveData();
        app.renderPersonCheckoutList(); // Refresh person view
    },

    returnItemFromItemPage: (itemNumber) => {
        if(!confirm("Are you sure you want to return this item?")) return;
        const item = app.data.items.find(i => i.number === itemNumber);
        item.checkedOutTo = null;
        app.saveData();
        app.openItemModal(itemNumber); // Refresh item view
        app.renderItems(); // Refresh list
    },


    // 3. Checkout (Search & Link)
    openItemSearchModal: () => {
        document.getElementById('modal-person').classList.add('hidden');
        document.getElementById('modal-item-search').classList.remove('hidden');
        document.getElementById('search-checkout-items').value = ''; // Clear search
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

        // Filter: Must be available AND match search
        const available = app.data.items.filter(i => 
            !i.checkedOutTo && 
            (i.name.toLowerCase().includes(query) || i.number.toLowerCase().includes(query))
        );

        if (available.length === 0) {
            list.innerHTML = `<p style="text-align:center; padding:20px;">No available items found.</p>`;
        }

        available.forEach(i => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<strong>${i.name}</strong> <small>(#${i.number})</small>`;
            // Action: Link this item to the current student
            div.onclick = () => app.checkoutItem(i.number);
            list.appendChild(div);
        });
    },

    checkoutItem: (itemNumber) => {
        const item = app.data.items.find(i => i.number === itemNumber);
        // THE LINKING HAPPENS HERE
        item.checkedOutTo = app.currentStudent.netId; 
        app.saveData();
        app.closeItemSearchModal();
        app.renderPersonCheckoutList(); 
    },

    // 4. Quick Add (Create & Link immediately)
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

        // Create & Link
        app.data.items.unshift({ name, number, checkedOutTo: app.currentStudent.netId, timestamp: Date.now() });
        app.saveData();
        
        e.target.reset();
        document.getElementById('modal-quick-item').classList.add('hidden');
        app.renderPersonCheckoutList();
    },

    closeModal: (id) => {
        document.getElementById(id).classList.add('hidden');
    }
};

app.init();
