// Cloudflare Worker 实现日历应用的后端 API

// 处理请求的主函数
export default {
  async fetch(request, env, ctx) {
    try {
      // 解析请求 URL
      const url = new URL(request.url)
      const path = url.pathname

      // 获取用户 ID
      const userId = request.headers.get("X-User-ID")
      if (!userId) {
        return new Response(JSON.stringify({ error: "缺少用户 ID" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      // 路由处理
      if (path === "/api/todos" && request.method === "GET") {
        return await handleGetTodos(request, env, userId)
      } else if (path === "/api/todos" && request.method === "POST") {
        return await handleCreateTodo(request, env, userId)
      } else if (path === "/api/todos" && request.method === "PUT") {
        return await handleUpdateTodo(request, env, userId)
      } else if (path === "/api/todos" && request.method === "DELETE") {
        return await handleDeleteTodo(request, env, userId)
      } else if (path === "/api/completed-instances" && request.method === "POST") {
        return await handleToggleCompletedInstance(request, env, userId)
      } else if (path === "/api/deleted-instances" && request.method === "POST") {
        return await handleCreateDeletedInstance(request, env, userId)
      } else {
        return new Response(JSON.stringify({ error: "无效的 API 路径" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
    } catch (error) {
      console.error("处理请求时出错:", error)
      return new Response(JSON.stringify({ error: "服务器内部错误" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  },
}

// 获取待办事项列表
async function handleGetTodos(request, env, userId) {
  const url = new URL(request.url)
  const startDate = url.searchParams.get("startDate")
  const endDate = url.searchParams.get("endDate")

  if (!startDate || !endDate) {
    return new Response(JSON.stringify({ error: "缺少开始日期或结束日期参数" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    // 查询待办事项
    const todosResult = await env.DB.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `)
      .bind(userId, startDate, endDate)
      .all()

    // 查询已完成的实例
    const completedInstancesResult = await env.DB.prepare(`
      SELECT * FROM completed_instances 
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `)
      .bind(userId, startDate, endDate)
      .all()

    // 查询已删除的实例
    const deletedInstancesResult = await env.DB.prepare(`
      SELECT * FROM deleted_instances 
      WHERE user_id = ? AND date BETWEEN ? AND ?
    `)
      .bind(userId, startDate, endDate)
      .all()

    return new Response(
      JSON.stringify({
        todos: todosResult.results || [],
        completedInstances: completedInstancesResult.results || [],
        deletedInstances: deletedInstancesResult.results || [],
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("获取待办事项时出错:", error)
    return new Response(JSON.stringify({ error: "获取待办事项失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// 创建新的待办事项
async function handleCreateTodo(request, env, userId) {
  try {
    const data = await request.json()

    if (!data.text || !data.date) {
      return new Response(JSON.stringify({ error: "缺少必要的字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const repeatType = data.repeatType || "none"

    // 插入新的待办事项
    const result = await env.DB.prepare(`
      INSERT INTO todos (text, date, repeat_type, completed, user_id)
      VALUES (?, ?, ?, 0, ?)
    `)
      .bind(data.text, data.date, repeatType, userId)
      .run()

    if (result.success) {
      // 获取新插入的待办事项
      const todo = await env.DB.prepare(`
        SELECT * FROM todos WHERE id = ?
      `)
        .bind(result.meta.last_row_id)
        .first()

      return new Response(
        JSON.stringify({
          success: true,
          todo,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    } else {
      throw new Error("插入待办事项失败")
    }
  } catch (error) {
    console.error("创建待办事项时出错:", error)
    return new Response(JSON.stringify({ error: "创建待办事项失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// 更新待办事项
async function handleUpdateTodo(request, env, userId) {
  try {
    const data = await request.json()

    if (!data.id) {
      return new Response(JSON.stringify({ error: "缺少待办事项 ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 验证待办事项所有权
    const todo = await env.DB.prepare(`
      SELECT * FROM todos WHERE id = ? AND user_id = ?
    `)
      .bind(data.id, userId)
      .first()

    if (!todo) {
      return new Response(JSON.stringify({ error: "待办事项不存在或无权限" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 更新待办事项
    const completed = data.completed !== undefined ? (data.completed ? 1 : 0) : todo.completed

    const result = await env.DB.prepare(`
      UPDATE todos SET completed = ? WHERE id = ?
    `)
      .bind(completed, data.id)
      .run()

    return new Response(
      JSON.stringify({
        success: result.success,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("更新待办事项时出错:", error)
    return new Response(JSON.stringify({ error: "更新待办事项失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// 删除待办事项
async function handleDeleteTodo(request, env, userId) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return new Response(JSON.stringify({ error: "缺少待办事项 ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 验证待办事项所有权
    const todo = await env.DB.prepare(`
      SELECT * FROM todos WHERE id = ? AND user_id = ?
    `)
      .bind(id, userId)
      .first()

    if (!todo) {
      return new Response(JSON.stringify({ error: "待办事项不存在或无权限" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 删除待办事项
    const result = await env.DB.prepare(`
      DELETE FROM todos WHERE id = ?
    `)
      .bind(id)
      .run()

    return new Response(
      JSON.stringify({
        success: result.success,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("删除待办事项时出错:", error)
    return new Response(JSON.stringify({ error: "删除待办事项失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// 切换待办事项实例的完成状态
async function handleToggleCompletedInstance(request, env, userId) {
  try {
    const data = await request.json()

    if (!data.todoId || !data.date) {
      return new Response(JSON.stringify({ error: "缺少必要的字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 验证待办事项所有权
    const todo = await env.DB.prepare(`
      SELECT * FROM todos WHERE id = ? AND user_id = ?
    `)
      .bind(data.todoId, userId)
      .first()

    if (!todo) {
      return new Response(JSON.stringify({ error: "待办事项不存在或无权限" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 检查是否已存在完成记录
    const existingInstance = await env.DB.prepare(`
      SELECT * FROM completed_instances 
      WHERE todo_id = ? AND date = ? AND user_id = ?
    `)
      .bind(data.todoId, data.date, userId)
      .first()

    let completed = false

    if (existingInstance) {
      // 如果存在，则删除记录（取消完成）
      await env.DB.prepare(`
        DELETE FROM completed_instances 
        WHERE todo_id = ? AND date = ? AND user_id = ?
      `)
        .bind(data.todoId, data.date, userId)
        .run()
    } else {
      // 如果不存在，则添加记录（标记为完成）
      await env.DB.prepare(`
        INSERT INTO completed_instances (todo_id, date, user_id)
        VALUES (?, ?, ?)
      `)
        .bind(data.todoId, data.date, userId)
        .run()
      completed = true
    }

    return new Response(
      JSON.stringify({
        success: true,
        completed,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("切换完成状态时出错:", error)
    return new Response(JSON.stringify({ error: "切换完成状态失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// 创建已删除的实例记录
async function handleCreateDeletedInstance(request, env, userId) {
  try {
    const data = await request.json()

    if (!data.todoId || !data.date) {
      return new Response(JSON.stringify({ error: "缺少必要的字段" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 验证待办事项所有权
    const todo = await env.DB.prepare(`
      SELECT * FROM todos WHERE id = ? AND user_id = ?
    `)
      .bind(data.todoId, userId)
      .first()

    if (!todo) {
      return new Response(JSON.stringify({ error: "待办事项不存在或无权限" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 检查是否已存在删除记录
    const existingInstance = await env.DB.prepare(`
      SELECT * FROM deleted_instances 
      WHERE todo_id = ? AND date = ? AND user_id = ?
    `)
      .bind(data.todoId, data.date, userId)
      .first()

    if (!existingInstance) {
      // 添加删除记录
      await env.DB.prepare(`
        INSERT INTO deleted_instances (todo_id, date, user_id)
        VALUES (?, ?, ?)
      `)
        .bind(data.todoId, data.date, userId)
        .run()
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("创建删除记录时出错:", error)
    return new Response(JSON.stringify({ error: "创建删除记录失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

