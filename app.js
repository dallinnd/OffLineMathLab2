const app = {
    data: {
        students: [], 
        items: []     
    },
    currentStudent: null,

    init: () => {
        app.loadData();
        app.nav('home');
        
        window.onclick = (event) => {
            if (event.target.classList.contains('modal')) {
                app.closeModal(event.target.id);
            }
        };
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

    // --- IMPORT / EXPORT LOGIC ---

    // 1. Export Data (ZIP of 2 CSVs)
    exportData: () => {
        if (!window.JSZip) {
            alert("Export library loading... please try again in a moment.");
            return;
        }

        const zip = new JSZip();

        // Create Students CSV
        // Header: Name,NetID,Phone
        let studentCSV = "Name,NetID,Phone\n";
        app.data.students.forEach(s => {
            // Escape commas in names just in case
            const cleanName = s.name.includes(',') ? `"${s.name}"` : s.name;
            studentCSV += `${cleanName},${s.netId},${s.phone}\n`;
        });
        zip.file("students.csv", studentCSV);

        // Create Items CSV
        // Header: ItemName,ItemNumber,CheckedOutTo
        let itemCSV = "ItemName,ItemNumber,CheckedOutTo\n";
        app.data.items.forEach(i => {
            const cleanName = i.name.includes(',') ? `"${i.name}"` : i.name;
            const holder = i.checkedOutTo ? i.checkedOutTo : "";
            itemCSV += `${cleanName},${i.number},${holder}\n`;
        });
        zip.file("items.csv", itemCSV);

        // Generate Zip and Download
        zip.generateAsync({type:"blob"}).then(function(content) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "MathLab_Inventory_Backup.zip";
            link.click();
        });
    },

    // 2. Import Students
    importStudents: (input) => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n');
            let addedCount = 0;

            // Skip Header row (index 0)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // Simple parse assuming format: Name,NetID,Phone
                // (Note: This simple split fails if Name has a comma like "Doe, John". 
                // For a simple inventory, we assume names are "John Doe")
                const cols = row.split(',');
                if (cols.length < 3) continue;

                const name = cols[0].trim().replace(/"/g, ''); // remove quotes if present
                const netId = cols[1].trim();
                const phone = cols[2].trim();

                // DUPLICATE CHECK
                if (!app.data.students.find(s => s.netId === netId)) {
                    app.data.students.unshift({ 
                        name, netId, phone, timestamp: Date.now() 
                    });
                    addedCount++;
                }
            }

            app.saveData();
            alert(`Import Complete!\nAdded ${addedCount} new students.`);
            input.value = ''; // Reset input so same file can be selected again if needed
            app.renderStudents(); // Refresh background list
        };
        reader.readAsText(file);
    },

    // 3. Import Items
    importItems: (input) => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n');
            let addedCount = 0;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // Format: ItemName,ItemNumber,CheckedOutTo
                const cols = row.split(',');
                if (cols.length < 2) continue;

                const name = cols[0].trim().replace(/"/g, '');
                const number = cols[1].trim();
                let checkedOutTo = cols[2] ? cols[2].trim() : null;
                if (checkedOutTo === "") checkedOutTo = null;

                // DUPLICATE CHECK
                if (!app.data.items.find(item => item.number === number)) {
                    app.data.items.unshift({ 
                        name, number, checkedOutTo, timestamp: Date.now() 
                    });
                    addedCount++;
                }
            }

            app.saveData();
            alert(`Import Complete!\nAdded ${addedCount} new items.`);
            input.value = '';
            app.renderItems();
        };
        reader.readAsText(file);
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
                <div class="list-actions">
                    <button class="btn-view" onclick="app.openPersonModal('${s.netId}')">View</button>
                    <button class="btn-edit-list" onclick="app.editPerson('${s.netId}')">Edit</button>
                    <button class="btn-delete-list" onclick="app.deletePerson('${s.netId}')">Delete</button>
                </div>
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
                <div style="flex-grow:1">
                    <strong>${i.name}</strong> <small>(#${i.number})</small><br>
                    ${statusBadge}
                </div> 
                <div class="list-actions">
                    <button class="btn-view" onclick="app.openItemModal('${i.number}')">View</button>
                    <button class="btn-edit-list" onclick="app.editItem('${i.number}')">Edit</button>
                    <button class="btn-delete-list" onclick="app.deleteItem('${i.number}')">Delete</button>
                </div>
            `;
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
                    <h2 style="margin:0; border:none;">${student.name}</h2>
                    <p style="margin:5px 0; color:#64748b">NetID: ${student.netId}</p>
                    <p style="margin:0; color:#64748b">Phone: ${student.phone}</p>
                </div>
            </div>
        `;

        app.renderPersonCheckoutList();
        document.getElementById('modal-person').classList.remove('hidden');
    },

    deletePerson: (netId) => {
        const student = app.data.students.find(s => s.netId === netId);
        const name = student ? student.name : netId;

        if(!confirm(`DELETE STUDENT: ${name}?\n\nThis will return all items checked out to them and permanently delete the student record.`)) return;

        app.data.items.forEach(i => {
            if (i.checkedOutTo === netId) {
                i.checkedOutTo = null;
            }
        });

        app.data.students = app.data.students.filter(s => s.netId !== netId);
        app.saveData();
        app.renderStudents();
        app.closeModal('modal-person');
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
            if (!document.getElementById('modal-person').classList.contains('hidden')) {
                 app.openPersonModal(netId);
            }
            app.renderStudents(); 
        }
    },

    // 2. Item Popup
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
            </div>
            ${linkSectionHtml}
        `;
        document.getElementById('modal-item').classList.remove('hidden');
    },

    deleteItem: (number) => {
        const item = app.data.items.find(i => i.number === number);
        if(!confirm(`DELETE ITEM: ${item.name}?\n\nIf this item is checked out, it will be unlinked from the student.`)) return;
        
        app.data.items = app.data.items.filter(i => i.number !== number);
        app.saveData();
        app.renderItems();
        app.closeModal('modal-item');
    },

    editItem: (number) => {
        const item = app.data.items.find(i => i.number === number);
        const newName = prompt("Edit Item Name:", item.name);
        if (newName) {
            item.name = newName;
            app.saveData();
            if (!document.getElementById('modal-item').classList.contains('hidden')) {
                app.openItemModal(number);
             }
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
        app.openItemModal(itemNumber);
        app.renderItems();
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
    }
};

app.init();
