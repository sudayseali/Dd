export type TaskStatus = 'pending' | 'success' | 'rejected' | 'waiting';

export interface UserTask {
  id: string; // Unique id
  telegramId: string;
  phone: string;
  country: string;
  accountType: 'Personal' | 'Business';
  status: TaskStatus;
  code?: string;
  imageUrl?: string;
  successMessage?: string;
  createdAt: number;
}

const STORAGE_KEY = 'tma_tasks_db';

export class MockDatabase {
  static getTasks(): UserTask[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveTask(task: Omit<UserTask, 'id' | 'createdAt' | 'status'>): UserTask {
    const tasks = this.getTasks();
    const existingIndex = tasks.findIndex(t => t.telegramId === task.telegramId);
    
    const newTask: UserTask = {
      ...task,
      id: crypto.randomUUID(),
      status: 'waiting',
      createdAt: Date.now(),
    };

    if (existingIndex >= 0) {
      tasks[existingIndex] = { ...tasks[existingIndex], ...newTask, id: tasks[existingIndex].id, createdAt: tasks[existingIndex].createdAt };
    } else {
      tasks.push(newTask);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new Event('storage')); // Trigger update across tabs
    return newTask;
  }

  static updateTask(telegramId: string, updates: Partial<UserTask>): UserTask | null {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex(t => t.telegramId === telegramId);
    
    if (taskIndex === -1) return null;
    
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new Event('storage'));
    
    return tasks[taskIndex];
  }

  static getTaskByTelegramId(telegramId: string): UserTask | null {
    return this.getTasks().find(t => t.telegramId === telegramId) || null;
  }
}
