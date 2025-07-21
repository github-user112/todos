<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>日历应用</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    
    #login-container {
      display: none;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20px;
    }
    
    #login-error {
      color: red;
      margin-top: 10px;
      display: none;
    }
    
    .calendar-container {
      width: 100%;
      max-width: 600px;
    }
    
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
    }
    
    .calendar-day {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: center;
      cursor: pointer;
    }
    
    .calendar-day.other-month {
      color: #aaa;
    }
    
    .calendar-day.current-day {
      background-color: #ffc;
    }
    
    .day-number {
      font-weight: bold;
    }
    
    .lunar-date, .holiday {
      font-size: 0.8em;
      color: #777;
    }
    
    .todo-list {
      margin-top: 5px;
    }
    
    .todo-item {
      font-size: 0.9em;
      padding: 3px;
      background-color: #eef;
      margin-bottom: 2px;
      border-radius: 3px;
    }
    
    .todo-item.completed {
      text-decoration: line-through;
      color: #777;
    }
    
    #add-todo-popup {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      justify-content: center;
      align-items: center;
    }
    
    .popup-content {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    }
    
    #todo-actions {
      display: none;
      position: absolute;
      background-color: white;
      border: 1px solid #ccc;
      padding: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      z-index: 10;
    }
    
    #todo-actions button {
      display: block;
      margin-bottom: 5px;
      padding: 5px 10px;
      border: none;
      background-color: #007bff;
      color: white;
      cursor: pointer;
    }
    
    #loading-indicator {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 2em;
      z-index: 1000;
    }
    
    /* 移动设备样式 */
    @media (max-width: 480px) {
      .calendar-container {
        width: 100%;
      }
      
      #todo-actions {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        border: none;
        box-shadow: none;
        border-radius: 0;
      }
      
      #todo-actions button {
        display: inline-block;
        width: 48%;
        margin: 1%;
      }
    }
  </style>
</head>
<body>
  <div id="loading-indicator">加载中...</div>
  
  <div id="login-container">
    <h2>登录</h2>
    <input type="password" id="password-input" placeholder="密码">
    <button id="login-btn">登录</button>
    <div id="login-error">密码错误，请重试</div>
  </div>
  
  <div class="calendar-container">
    <div class="calendar-header">
      <button id="prev-month">&lt;</button>
      <h2 class="calendar-title"></h2>
      <button id="next-month">&gt;</button>
      <button id="current-month">今天</button>
    </div>
    <div id="calendar-grid"></div>
  </div>
  
  <div id="add-todo-popup">
    <div class="popup-content">
      <h2>添加待办事项</h2>
      <input type="text" id="todo-text" placeholder="待办事项">
      <select id="todo-repeat">
        <option value="none">不重复</option>
        <option value="daily">每天</option>
        <option value="weekly">每周</option>
        <option value="monthly">每月</option>
        <option value="yearly">每年</option>
      </select>
      <button id="save-todo">保存</button>
      <button id="cancel-todo">取消</button>
    </div>
  </div>
  
  <div id="todo-actions">
    <button id="complete-todo">完成</button>
    <button id="delete-todo">删除</button>
  </div>
  
  <script>
    // 声明变量
    let currentDate = new Date();
    let todos = [];
    let completedInstances = [];
    let deletedInstances = [];
    let selectedDate = null;
    let selectedTodo = null;
    let selectedTodoDate = null;
    let userId = null;
    let authToken = null;
    let lunarData = {
      "2024-01-01": "元旦",
      "2024-02-10": "春节",
      "2024-02-11": "春节",
      "2024-02-12": "春节",
      "2024-04-04": "清明节",
      "2024-05-01": "劳动节",
      "2024-06-10": "端午节",
      "2024-09-17": "中秋节",
      "2024-10-01": "国庆节",
      "2024-10-02": "国庆节",
      "2024-10-03": "国庆节",
      
      // 2025年节假日
      "2025-01-01": "元旦",
      "2025-01-29": "春节",
      "2025-01-30": "春节",
      "2025-01-31": "春节",
      "2025-04-05": "清明节",
      "2025-05-01": "劳动节",
      "2025-06-01": "端午节",
      "2025-10-06": "中秋节",
      "2025-10-01": "国庆节",
      "2025-10-02": "国庆节",
      "2025-10-03": "国庆节",
      
      // 2026年节假日
      "2026-01-01": "元旦",
      "2026-02-17": "春节",
      "2026-02-18": "春节",
      "2026-02-19": "春节",
      "2026-04-05": "清明节",
      "2026-05-01": "劳动节",
      "2026-06-18": "端午节",
      "2026-09-25": "中秋节",
      "2026-10-01": "国庆节",
      "2026-10-02": "国庆节",
      "2026-10-03": "国庆节"
    };

    let holidayData = {
      "2024-01-01": "元旦",
      "2024-02-10": "春节",
      "2024-02-11": "春节",
      "2024-02-12": "春节",
      "2024-04-04": "清明节",
      "2024-05-01": "劳动节",
      "2024-06-10": "端午节",
      "2024-09-17": "中秋节",
      "2024-10-01": "国庆节",
      "2024-10-02": "国庆节",
      "2024-10-03": "国庆节",
      
      // 2025年节假日
      "2025-01-01": "元旦",
      "2025-01-29": "春节",
      "2025-01-30": "春节",
      "2025-01-31": "春节",
      "2025-04-05": "清明节",
      "2025-05-01": "劳动节",
      "2025-06-01": "端午节",
      "2025-10-06": "中秋节",
      "2025-10-01": "国庆节",
      "2025-10-02": "国庆节",
      "2025-10-03": "国庆节",
      
      // 2026年节假日
      "2026-01-01": "元旦",
      "2026-02-17": "春节",
      "2026-02-18": "春节",
      "2026-02-19": "春节",
      "2026-04-05": "清明节",
      "2026-05-01": "劳动节",
      "2026-06-18": "端午节",
      "2026-09-25": "中秋节",
      "2026-10-01": "国庆节",
      "2026-10-02": "国庆节",
      "2026-10-03": "国庆节"
    };
    
    // 获取农历日期
    function getLunarDate(date) {
      const dateStr = formatDate(date);
      return lunarData[dateStr] || "";
    }
    
    // 获取节假日
    function getHoliday(date) {
      const dateStr = formatDate(date);
      return holidayData[dateStr] || "";
    }
    
    // 显示加载指示器
    function showLoading() {
      document.getElementById('loading-indicator').style.display = 'flex';
    }
    
    // 隐藏加载指示器
    function hideLoading() {
      document.getElementById('loading-indicator').style.display = 'none';
    }
    
    // API 请求函数
    async function apiRequest(endpoint, method = 'GET', data = null) {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const options = {
        method,
        headers
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      try {
        const response = await fetch(endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || '请求失败');
        }
        
        return result;
      } catch (error) {
        console.error('API 请求错误:', error);
        throw error;
      }
    }
    
    // 检查登录状态
    function checkLogin() {
      const token = localStorage.getItem('calendar-auth-token');
      const user = localStorage.getItem('calendar-user-id');
      
      if (token && user) {
        authToken = token;
        userId = parseInt(user);
        document.getElementById('login-container').style.display = 'none';
        return true;
      } else {
        document.getElementById('login-container').style.display = 'flex';
        return false;
      }
    }
    
    // 处理登录
    async function handleLogin() {
      const password = document.getElementById('password-input').value;
      
      if (!password) {
        document.getElementById('login-error').style.display = 'block';
        return;
      }
      
      showLoading();
      
      try {
        const result = await apiRequest('/api/login', 'POST', { password }, { 'Authorization': `Bearer ${authToken}` });
        
        if (result.success) {
          authToken = result.token;
          userId = result.userId;
          
          localStorage.setItem('calendar-auth-token', authToken);
          localStorage.setItem('calendar-user-id', userId);
          
          document.getElementById('login-container').style.display = 'none';
          initCalendar();
        } else {
          document.getElementById('login-error').style.display = 'block';
        }
      } catch (error) {
        document.getElementById('login-error').textContent = error.message || '登录失败，请重试';
        document.getElementById('login-error').style.display = 'block';
      } finally {
        hideLoading();
      }
    }
    
    // 初始化日历
    async function initCalendar() {
      showLoading();
      
      try {
        await fetchCalendarData();
        renderCalendar(currentDate);
        setupEventListeners();
      } catch (error) {
        console.error('初始化日历失败:', error);
        alert('加载日历数据失败，请刷新页面重试');
      } finally {
        hideLoading();
      }
    }
    
    // 获取日历数据
    async function fetchCalendarData() {
      // 计算当前月的第一天和最后一天
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month - 1, 1); // 包括上个月
      const lastDay = new Date(year, month + 2, 0); // 包括下个月
      
      const startDate = formatDate(firstDay);
      const endDate = formatDate(lastDay);
      
      const result = await apiRequest(`/api/todos?startDate=${startDate}&endDate=${endDate}&userId=${userId}`, 'GET', null, { 'Authorization': `Bearer ${authToken}` });
      
      todos = result.todos || [];
      completedInstances = result.completedInstances || [];
      deletedInstances = result.deletedInstances || [];
    }
    
    // 渲染日历
    function renderCalendar(date) {
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // 更新标题
      document.querySelector('.calendar-title').textContent = `${year}年${month + 1}月`;
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // 获取当前月第一天是星期几 (0-6)
      let firstDayOfWeek = firstDay.getDay();
      if (firstDayOfWeek === 0) firstDayOfWeek = 7; // 调整星期日为7
      
      const daysInMonth = lastDay.getDate();
      
      // 获取上个月的最后几天
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      
      // 获取当前日期
      const today = new Date();
      const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
      const currentDay = today.getDate();
      
      const calendarGrid = document.getElementById('calendar-grid');
      calendarGrid.innerHTML = '';
      
      // 添加星期标题
      const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
      weekdays.forEach(day => {
        const weekdayElement = document.createElement('div');
        weekdayElement.className = 'calendar-weekday';
        weekdayElement.textContent = day;
        calendarGrid.appendChild(weekdayElement);
      });
      
      // 添加上个月的日期
      for (let i = firstDayOfWeek - 1; i > 0; i--) {
        const dayElement = createDayElement(prevMonthLastDay - i + 1, true, new Date(year, month - 1, prevMonthLastDay - i + 1));
        calendarGrid.appendChild(dayElement);
      }
      
      // 添加当前月的日期
      for (let i = 1; i <= daysInMonth; i++) {
        const isToday = isCurrentMonth && i === currentDay;
        const dayElement = createDayElement(i, false, new Date(year, month, i), isToday);
        calendarGrid.appendChild(dayElement);
      }
      
      // 添加下个月的日期
      const remainingCells = 42 - (firstDayOfWeek - 1) - daysInMonth;
      for (let i = 1; i <= remainingCells; i++) {
        const dayElement = createDayElement(i, true, new Date(year, month + 1, i));
        calendarGrid.appendChild(dayElement);
      }
    }
    
    // 创建日期元素
    function createDayElement(day, isOtherMonth, date, isToday = false) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      if (isOtherMonth) dayElement.classList.add('other-month');
      if (isToday) dayElement.classList.add('current-day');
      
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = day;
      dayElement.appendChild(dayNumber);
      
      // 添加农历日期
      const lunarDate = getLunarDate(date);
      if (lunarDate) {
        const lunarElement = document.createElement('div');
        lunarElement.className = 'lunar-date';
        lunarElement.textContent = lunarDate;
        dayElement.appendChild(lunarElement);
      }
      
      // 添加节假日
      const holiday = getHoliday(date);
      if (holiday) {
        const holidayElement = document.createElement('div');
        holidayElement.className = 'holiday';
        holidayElement.textContent = holiday;
        dayElement.appendChild(holidayElement);
      }
      
      const todoList = document.createElement('div');
      todoList.className = 'todo-list';
      dayElement.appendChild(todoList);
      
      // 添加日期的数据属性
      dayElement.dataset.date = formatDate(date);
      
      // 渲染待办事项
      renderTodosForDate(todoList, date);
      
      return dayElement;
    }
    
    // 为特定日期渲染待办事项
    function renderTodosForDate(container, date) {
      const dateStr = formatDate(date);
      const todosForDate = getTodosForDate(date);
      
      container.innerHTML = '';
      
      todosForDate.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        
        // 检查是否是已完成的实例
        const isCompleted = isInstanceCompleted(todo.id, dateStr);
        if (isCompleted || todo.completed) todoItem.classList.add('completed');
        
        todoItem.textContent = todo.text;
        todoItem.dataset.id = todo.id;
        todoItem.dataset.date = dateStr;
        
        container.appendChild(todoItem);
      });
    }
    
    // 获取特定日期的待办事项
    function getTodosForDate(date) {
      const dateStr = formatDate(date);
      const result = [];
      
      todos.forEach(todo => {
        // 检查是否是已删除的实例
        if (isInstanceDeleted(todo.id, dateStr)) {
          return;
        }
        
        // 检查直接匹配的日期
        if (todo.date === dateStr) {
          result.push(todo);
          return;
        }
        
        // 检查重复的待办事项
        if (!todo.repeat_type || todo.repeat_type === 'none') return;
        
        const todoDate = new Date(todo.date);
        const currentDate = new Date(dateStr);
        
        // 检查重复事项是否应该显示在当前日期
        let shouldShow = false;
        
        if (todo.repeat_type === 'daily') {
          shouldShow = true;
        } else if (todo.repeat_type === 'weekly' && todoDate.getDay() === currentDate.getDay()) {
          shouldShow = true;
        } else if (todo.repeat_type === 'monthly' && todoDate.getDate() === currentDate.getDate()) {
          shouldShow = true;
        } else if (todo.repeat_type === 'yearly' && 
                  todoDate.getDate() === currentDate.getDate() && 
                  todoDate.getMonth() === currentDate.getMonth()) {
          shouldShow = true;
        }
        
        if (shouldShow) {
          // 创建一个副本，以便我们可以为每个实例设置不同的状态
          const todoCopy = {...todo};
          result.push(todoCopy);
        }
      });
      
      return result;
    }
    
    // 检查特定实例是否已完成
    function isInstanceCompleted(todoId, dateStr) {
      return completedInstances.some(instance => 
        instance.todo_id === todoId && instance.date === dateStr
      );
    }
    
    // 检查特定实例是否已删除
    function isInstanceDeleted(todoId, dateStr) {
      return deletedInstances.some(instance => 
        instance.todo_id === todoId && instance.date === dateStr
      );
    }
    
    // 设置事件监听器
    function setupEventListeners() {
      // 登录按钮
      document.getElementById('login-btn').addEventListener('click', handleLogin);
      document.getElementById('password-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleLogin();
        }
      });
      
      // 月份导航
      document.getElementById('prev-month').addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        showLoading();
        try {
          await fetchCalendarData();
          renderCalendar(currentDate);
        } finally {
          hideLoading();
        }
      });
      
      document.getElementById('next-month').addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        showLoading();
        try {
          await fetchCalendarData();
          renderCalendar(currentDate);
        } finally {
          hideLoading();
        }
      });
      
      document.getElementById('current-month').addEventListener('click', async () => {
        currentDate = new Date();
        showLoading();
        try {
          await fetchCalendarData();
          renderCalendar(currentDate);
        } finally {
          hideLoading();
        }
      });
      
      // 日历网格事件委托
      document.getElementById('calendar-grid').addEventListener('dblclick', (e) => {
        const dayElement = e.target.closest('.calendar-day');
        if (dayElement) {
          selectedDate = dayElement.dataset.date;
          openAddTodoPopup();
        }
      });
      
      document.getElementById('calendar-grid').addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (todoItem) {
          selectedTodo = todoItem.dataset.id;
          selectedTodoDate = todoItem.dataset.date;
          openTodoActions(todoItem);
        } else {
          closeTodoActions();
        }
      });
      
      // 添加待办事项弹窗
      document.getElementById('cancel-todo').addEventListener('click', closeAddTodoPopup);
      document.getElementById('save-todo').addEventListener('click', saveTodo);
      
      // 待办事项操作
      document.getElementById('complete-todo').addEventListener('click', completeTodo);
      document.getElementById('delete-todo').addEventListener('click', deleteTodo);
      
      // 点击其他地方关闭操作菜单
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.todo-item') && !e.target.closest('.todo-actions')) {
          closeTodoActions();
        }
      });
      
      // 为移动设备添加触摸事件
      document.getElementById('calendar-grid').addEventListener('touchstart', handleTouchStart);
      document.getElementById('calendar-grid').addEventListener('touchend', handleTouchEnd);
    }
    
    // 处理触摸开始
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    
    function handleTouchStart(e) {
      touchStartTime = new Date().getTime();
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }
    
    // 处理触摸结束
    function handleTouchEnd(e) {
      const touchEndTime = new Date().getTime();
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      
      const touchDuration = touchEndTime - touchStartTime;
      const touchDistanceX = Math.abs(touchEndX - touchStartX);
      const touchDistanceY = Math.abs(touchEndY - touchStartY);
      
      // 检测双击
      if (touchDuration < 300 && touchDistanceX < 10 && touchDistanceY < 10) {
        const dayElement = e.target.closest('.calendar-day');
        if (dayElement) {
          selectedDate = dayElement.dataset.date;
          openAddTodoPopup();
        }
      }
      
      // 检测左右滑动
      if (touchDistanceX > 100 && touchDistanceY < 50) {
        if (touchEndX < touchStartX) {
          // 向左滑动，下个月
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else {
          // 向右滑动，上个月
          currentDate.setMonth(currentDate.getMonth() - 1);
        }
        
        fetchCalendarData().then(() => {
          renderCalendar(currentDate);
        });
      }
    }
    
    // 打开添加待办事项弹窗
    function openAddTodoPopup() {
      document.getElementById('add-todo-popup').style.display = 'flex';
      document.getElementById('todo-text').focus();
    }
    
    // 关闭添加待办事项弹窗
    function closeAddTodoPopup() {
      document.getElementById('add-todo-popup').style.display = 'none';
      document.getElementById('todo-text').value = '';
      document.getElementById('todo-repeat').value = 'none';
    }
    
    // 保存待办事项
    async function saveTodo() {
      const text = document.getElementById('todo-text').value.trim();
      const repeatType = document.getElementById('todo-repeat').value;
      
      if (!text) return;
      
      showLoading();
      
      try {
        const result = await apiRequest('/api/todos', 'POST', {
          text,
          date: selectedDate,
          repeatType,
          userId
        });
        
        if (result.success) {
          // 添加新的待办事项到本地数组
          todos.push(result.todo);
          renderCalendar(currentDate);
          closeAddTodoPopup();
        }
      } catch (error) {
        console.error('保存待办事项失败:', error);
        alert('保存失败，请重试');
      } finally {
        hideLoading();
      }
    }
    
    // 打开待办事项操作菜单
    function openTodoActions(todoElement) {
      const actionsMenu = document.getElementById('todo-actions');
      
      // 检查是否是移动设备
      if (window.innerWidth <= 480) {
        actionsMenu.style.display = 'flex';
      } else {
        const rect = todoElement.getBoundingClientRect();
        actionsMenu.style.display = 'block';
        actionsMenu.style.top = `${rect.bottom}px`;
        actionsMenu.style.left = `${rect.left}px`;
      }
    }
    
    // 关闭待办事项操作菜单
    function closeTodoActions() {
      document.getElementById('todo-actions').style.display = 'none';
    }
    
    // 完成待办事项
    async function completeTodo() {
      if (!selectedTodo || !selectedTodoDate) return;
      
      showLoading();
      
      try {
        const todo = todos.find(t => t.id == selectedTodo);
        
        if (todo) {
          if ((!todo.repeat_type || todo.repeat_type === 'none') && todo.date === selectedTodoDate) {
            // 非重复事项，直接修改原始待办事项
            const result = await apiRequest('/api/todos', 'PUT', {
              id: selectedTodo,
              completed: !todo.completed
            });
            
            if (result.success) {
              // 更新本地数据
              todo.completed = !todo.completed;
            }
          } else {
            // 重复事项，记录特定实例的完成状态
            const result = await apiRequest('/api/completed-instances', 'POST', {
              todoId: selectedTodo,
              date: selectedTodoDate,
              userId
            });
            
            if (result.success) {
              // 更新本地数据
              if (result.completed) {
                completedInstances.push({
                  todo_id: parseInt(selectedTodo),
                  date: selectedTodoDate,
                  user_id: userId
                });
              } else {
                // 移除完成记录
                const index = completedInstances.findIndex(
                  instance => instance.todo_id == selectedTodo && instance.date === selectedTodoDate
                );
                if (index >= 0) {
                  completedInstances.splice(index, 1);
                }
              }
            }
          }
          
          renderCalendar(currentDate);
        }
      } catch (error) {
        console.error('更新待办事项状态失败:', error);
        alert('操作失败，请重试');
      } finally {
        hideLoading();
        closeTodoActions();
      }
    }
    
    // 删除待办事项
    async function deleteTodo() {
      if (!selectedTodo || !selectedTodoDate) return;
      
      showLoading();
      
      try {
        const todo = todos.find(t => t.id == selectedTodo);
        
        if (todo) {
          if ((!todo.repeat_type || todo.repeat_type === 'none') && todo.date === selectedTodoDate) {
            // 非重复事项，直接从数据库中删除
            const result = await apiRequest(`/api/todos?id=${selectedTodo}`, 'DELETE');
            
            if (result.success) {
              // 从本地数组中移除
              todos = todos.filter(t => t.id != selectedTodo);
            }
          } else {
            // 重复事项，记录特定实例的删除状态
            const result = await apiRequest('/api/deleted-instances', 'POST', {
              todoId: selectedTodo,
              date: selectedTodoDate,
              userId
            });
            
            if (result.success) {
              // 添加到本地删除实例数组
              deletedInstances.push({
                todo_id: parseInt(selectedTodo),
                date: selectedTodoDate,
                user_id: userId
              });
            }
          }
          
          renderCalendar(currentDate);
        }
      } catch (error) {
        console.error('删除待办事项失败:', error);
        alert('删除失败，请重试');
      } finally {
        hideLoading();
        closeTodoActions();
      }
    }
    
    // 格式化日期为 YYYY-MM-DD
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
      if (checkLogin()) {
        initCalendar();
      }
    });
  </script>
</body>
</html>

